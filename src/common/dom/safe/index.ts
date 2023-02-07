import * as v from '@badrap/valita';
import {syncScrypt} from 'scrypt-js';

import {type ServicesForBackend} from '~/common/backend';
import {
    type PlainData,
    type RawKey,
    ensureEncryptedDataWithNonceAhead,
    NACL_CONSTANTS,
    NONCE_UNGUARDED_TOKEN,
    wrapRawKey,
} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {TransferTag} from '~/common/enum';
import {type BaseErrorOptions, BaseError} from '~/common/error';
import {type ProfilePictureShareWith} from '~/common/model/settings/profile';
import {IDENTITY_STRING_LIST_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {
    type IdentityString,
    ensureIdentityString,
    validPublicNicknameOrUndefined,
} from '~/common/network/types';
import {type ReadonlyUint8Array, type WeakOpaque} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {base64ToU8a, u8aToBase64} from '~/common/utils/base64';
import {bytesToHex} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {registerErrorTransferHandler, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {nullOptional} from '~/common/utils/valita-helpers';

const SAFE_SERVER_TEMPLATE = 'https://safe-{prefix}.threema.ch';

/**
 * Services needed for Safe backup restore.
 */
export type ServicesForSafeBackup = Pick<
    ServicesForBackend,
    'compressor' | 'config' | 'crypto' | 'logging'
>;

/**
 * Threema Safe credentials.
 */
export interface SafeCredentials {
    readonly identity: IdentityString;
    readonly password: string;
    readonly customSafeServer?: {
        readonly url: string;
        readonly auth?: {
            readonly username: string;
            readonly password: string;
        };
    };
}

const SAFE_INFO_SCHEMA = v
    .object({
        version: v.literal(1),
        device: v.string().optional(),
    })
    .rest(v.unknown());

const SAFE_USER_SCHEMA = v
    .object({
        privatekey: v.string(),
        temporaryDeviceGroupKeyTodoRemove: v.string().optional(),
        nickname: v.string().optional(),
        profilePic: v.string().map<ReadonlyUint8Array>(base64ToU8a).optional(),
        profilePicRelease: v
            .array(v.union(v.string(), v.null()))
            .optional()
            .map<ProfilePictureShareWith | undefined>((release) => {
                if (release === undefined || release.length === 0) {
                    return undefined;
                }
                if (release[0] === '*') {
                    return {group: 'everyone'};
                }
                if (release[0] === null) {
                    return {group: 'nobody'};
                }
                return {group: 'allowList', allowList: IDENTITY_STRING_LIST_SCHEMA.parse(release)};
            }),
        links: v
            .array(
                v
                    .object({
                        type: v.string(),
                        name: v.string().optional(),
                        value: v.string(),
                    })
                    .rest(v.unknown()),
            )
            .optional()
            .default([]),
    })
    .rest(v.unknown());

const SAFE_CONTACT_SCHEMA = v
    .object({
        identity: v.string().map(ensureIdentityString),
        publickey: v.string().optional(),
        createdAt: v.number().optional(),
        lastUpdate: nullOptional(v.number()),
        verification: v.number(),
        workVerified: v.boolean().optional(),
        hidden: v.boolean().optional().default(false),
        firstname: v.string().optional().default(''),
        lastname: v.string().optional().default(''),
        nickname: v.string().map(validPublicNicknameOrUndefined).optional(),
        private: v.boolean().optional().default(false),
        readReceipts: v.number().optional(),
        typingIndicators: v.number().optional(),
    })
    .rest(v.unknown());

const SAFE_GROUP_SCHEMA = v
    .object({
        id: v.string(),
        creator: v.string(),
        groupname: v.string().optional(),
        createdAt: v.number().optional(),
        lastUpdate: nullOptional(v.number()),
        members: v.array(v.string()),
        deleted: v.boolean(),
        private: v.boolean().optional(),
    })
    .rest(v.unknown());

const SAFE_DISTRIBUTION_LIST_SCHEMA = v
    .object({
        id: v.string().optional(), // Note (ANDR-1683): Optional for compat reasons, should trigger warning if missing
        name: v.string(),
        createdAt: v.number().optional(),
        members: v.array(v.string()),
        private: v.boolean().optional(),
    })
    .rest(v.unknown());

const SAFE_SETTINGS_SCHEMA = v
    .object({
        syncContacts: v.boolean(),
        blockUnknown: v.boolean().optional(),
        readReceipts: v.boolean().optional(),
        sendTyping: v.boolean().optional(),
        threemaCalls: v.boolean().optional(),
        relayThreemaCalls: v.boolean().optional(),
        disableScreenshots: v.boolean().optional(),
        incognitoKeyboard: v.boolean().optional(),
        blockedContacts: v.array(v.string()).optional(),
        syncExcludedIds: v.array(v.string()).optional(),
        recentEmojis: v.array(v.string()).optional(),
    })
    .rest(v.unknown());

/**
 * Root schema for a Safe backup.
 *
 * IMPORTANT: All unknown keys must be ignored. This means that this schema and all object
 *            sub-schemas must be marked with `.rest(v.unknown())`.
 */
export const SAFE_SCHEMA = v
    .object({
        info: SAFE_INFO_SCHEMA,
        user: SAFE_USER_SCHEMA,
        contacts: v.array(SAFE_CONTACT_SCHEMA).optional().default([]),
        groups: v.array(SAFE_GROUP_SCHEMA).optional().default([]),
        distributionlists: v.array(SAFE_DISTRIBUTION_LIST_SCHEMA).optional().default([]),
        settings: SAFE_SETTINGS_SCHEMA,
    })
    .rest(v.unknown());

/**
 * Backup data from Threema Safe.
 */
export type SafeBackupData = Readonly<v.Infer<typeof SAFE_SCHEMA>>;

/**
 * Contact in the backup data from Threema Safe.
 */
export type SafeContact = Readonly<v.Infer<typeof SAFE_CONTACT_SCHEMA>>;

/**
 * Group in the backup data from Threema Safe.
 */
export type SafeGroup = Readonly<v.Infer<typeof SAFE_GROUP_SCHEMA>>;

/**
 * Safe Backup ID. Must be exactly 32 bytes long.
 */
export type SafeBackupId = WeakOpaque<ReadonlyUint8Array, {readonly SafeBackupId: unique symbol}>;

/**
 * Safe Backup Encryption Key. Must be exactly 32 bytes long.
 */
export type SafeEncryptionKey = WeakOpaque<RawKey<32>, {readonly SafeEncryptionKey: unique symbol}>;

/**
 * Error types that can happen in connection with Threema Safe.
 *
 * - fetch: A HTTP request failed.
 * - not-found: Backup does not exist for the specified credentials.
 * - crypto: A cryptography related problem occurred.
 * - encoding: Bytes could not be decompressed or decoded.
 * - validation: The backup JSON does not pass validation.
 */
export type SafeErrorType = 'fetch' | 'not-found' | 'crypto' | 'encoding' | 'validation';

const SAFE_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    SafeError,
    TransferTag.SAFE_ERROR,
    [type: SafeErrorType]
>({
    tag: TransferTag.SAFE_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new SafeError(type, message, {from: cause}),
});

export class SafeError extends BaseError {
    public [TRANSFER_MARKER] = SAFE_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: SafeErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/**
 * Derive the {@link SafeBackupId} and {@link SafeEncryptionKey} from the given credentials.
 *
 * ## Derivation
 *
 * A Threema Safe Master Key is derived as follows:
 *
 *     threemaSafeMasterKey = scrypt(P=Password, S=ThreemaID, N=65536, r=8, p=1, dkLen=64)
 *
 * The scrypt parameters have been chosen to provide a reasonable trade-off between calculation
 * time, memory usage and security without precluding the use on older/lower-end devices.
 *
 * The scrypt output is then split into two parts of 32 bytes each as follows:
 *
 *     threemaSafeBackupId = threemaSafeMasterKey[0..31]
 *     threemaSafeEncryptionKey = threemaSafeMasterKey[32..63]
 */
function deriveKey({
    identity,
    password,
}: SafeCredentials): [backupId: SafeBackupId, encryptionKey: SafeEncryptionKey] {
    const passwordBytes = UTF8.encode(password);
    const salt = UTF8.encode(identity);
    const N = 65536;
    const r = 8;
    const p = 1;
    const derivedKeyLength = 64;
    const masterKey = syncScrypt(passwordBytes, salt, N, r, p, derivedKeyLength);
    assert(masterKey.byteLength === 64);
    return [
        masterKey.slice(0, 32) as ReadonlyUint8Array as SafeBackupId,
        wrapRawKey(masterKey.slice(32, 64), NACL_CONSTANTS.KEY_LENGTH) as SafeEncryptionKey,
    ];
}

/**
 * Download the Threema Safe backup with the specified backup ID.
 *
 * @param hexBackupId Backup ID in lowercase hexadecimal form.
 * @returns The response body bytes.
 * @throws {SafeError} If downloading fails.
 */
async function fetchBackupBytes(
    hexBackupId: string,
    config: ServicesForSafeBackup['config'],
    customSafeServer?: SafeCredentials['customSafeServer'],
): Promise<Uint8Array> {
    const response = await requestSafeBackupUrl(hexBackupId, config, 'GET', customSafeServer);
    return new Uint8Array(await response.arrayBuffer());
}

/**
 * Request the Threema Safe backup with the specified backup ID.
 */
async function requestSafeBackupUrl(
    hexBackupId: string,
    config: ServicesForSafeBackup['config'],
    httpMethod: 'GET' | 'HEAD',
    customSafeServer?: SafeCredentials['customSafeServer'],
): Promise<Response> {
    // Determine URL
    let server: string;
    let path: string;
    const customSafeServerUrl =
        customSafeServer !== undefined ? new URL(customSafeServer.url) : undefined;
    if (customSafeServerUrl === undefined) {
        server = SAFE_SERVER_TEMPLATE.replace('{prefix}', hexBackupId.slice(0, 2));
        path = '/';
    } else {
        server = customSafeServerUrl.origin;
        path = customSafeServerUrl.pathname;
        if (!path.endsWith('/')) {
            path += '/';
        }
    }
    const url = new URL(`${path}backups/${hexBackupId}`, server);

    // Send download request
    let response: Response;
    try {
        const headers = new Headers({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'user-agent': config.USER_AGENT,
            'accept': 'application/octet-stream',
        });
        if (customSafeServer?.auth !== undefined) {
            // Note: Username may not contain a colon. However, we leave that to the user's server to validate.
            const credentials = `${customSafeServer.auth.username}:${customSafeServer.auth.password}`;
            const encoded = u8aToBase64(UTF8.encode(credentials));
            headers.set('authorization', `Basic ${encoded}`);
        }
        response = await fetch(`${url}`, {
            method: httpMethod,
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers,
        });
    } catch (error) {
        throw new SafeError('fetch', `Download request errored: ${error}`, {from: error});
    }

    // Handle response status code
    switch (response.status) {
        case 200:
            // Success
            break;
        case 400:
            throw new SafeError('fetch', 'Download request failed: Invalid request');
        case 404:
            throw new SafeError('not-found', 'Backup not found');
        case 429:
            throw new SafeError(
                'fetch',
                'Download request failed: Rate limit reached, please try again later',
            );
        default:
            throw new SafeError(
                'fetch',
                `Download request returned unexpected status: ${response.status}`,
            );
    }

    return response;
}

/**
 * Decrypt the specified encrypted backup bytes.
 *
 * @param encrypted The encrypted data.
 * @param encryptionKey The encryption key derived from the backup credentials.
 * @param services Services needed for decrypting the backup.
 * @returns The decrypted data.
 * @throws {SafeError} If decryption fails.
 */
function decryptBackupBytes(
    encrypted: Uint8Array,
    encryptionKey: SafeEncryptionKey,
    services: ServicesForSafeBackup,
): PlainData {
    const {crypto} = services;
    try {
        return crypto
            .getSecretBox(encryptionKey.asReadonly(), NONCE_UNGUARDED_TOKEN)
            .decryptorWithNonceAhead(
                CREATE_BUFFER_TOKEN,
                ensureEncryptedDataWithNonceAhead(encrypted),
            )
            .decrypt();
    } catch (error) {
        throw new SafeError('crypto', `Decrypting backup failed: ${error}`, {from: error});
    }
}

/**
 * Decompress (gzip) and decode (utf8) decrypted backup bytes.
 *
 * @param decryptedBytes The decrypted but compressed backup bytes
 * @param services Services needed for decrypting the backup
 * @returns The decoded data (JSON string)
 * @throws {SafeError} If decoding fails
 */
async function decodeBackupBytes(
    decryptedBytes: PlainData,
    services: ServicesForSafeBackup,
): Promise<string> {
    const {compressor} = services;

    let decompressed;
    try {
        decompressed = await compressor.decompress('gzip', decryptedBytes);
    } catch (error) {
        throw new SafeError('encoding', 'Decompressing backup failed', {from: error});
    }
    try {
        return UTF8.decode(decompressed as Uint8Array);
    } catch (error) {
        throw new SafeError('encoding', 'UTF-8 decoding backup failed', {from: error});
    }
}

/**
 * Check if the Threema Safe backup is available for the specified credentials. Note that this
 * function does not download, store, decrypt or validate the backup. It merely checks the existence
 * of the safe backup.
 *
 * To effectively download, decrypt and validate the safe backup please refer to
 * {@link downloadSafeBackup}.
 */
export async function isSafeBackupAvailable(
    services: Pick<ServicesForSafeBackup, 'config' | 'logging'>,
    credentials: SafeCredentials,
): Promise<boolean> {
    const {config, logging} = services;
    const log = logging.logger('backend.safe.checker');
    log.info(`Checking availability of safe backup for identity ${credentials.identity}`);

    // Derive keys from credentials
    log.debug(`Deriving backup key`);
    const [backupId] = deriveKey(credentials);
    try {
        const hexBackupId = bytesToHex(backupId);
        log.debug(`Backup ID is ${hexBackupId}`);

        // If the HEAD request succeeds, the backup exists on the server.
        await requestSafeBackupUrl(hexBackupId, config, 'HEAD', credentials.customSafeServer);
        return true;
    } catch (error) {
        // TODO(WEBMD-729): We currently return only false if we were unable to get a 200 from the
        // safe backup server. We do not make any difference if the reason was that the credentials
        // were incorrect or e.g. that the server was unreachable.
        if (error instanceof SafeError) {
            switch (error.type) {
                case 'not-found':
                    log.info('Invalid Safe Credentials', {error});
                    break;

                default:
                    log.info('Unexpected SafeError', {error});
                    break;
            }
        } else {
            log.info('Unexpected Error', {error});
        }
        return false;
    }
}

/**
 * Download the Threema Safe backup for the specified credentials.
 *
 * IMPORTANT: The {@link SafeBackupData} contains sensitive information, DO NOT hold a reference to
 *            it longer than needed.
 *
 * @param credentials Backup credentials
 * @param services Services needed for downloading and decrypting the backup
 * @returns validated safe backup contents
 * @throws {SafeError} If downloading, decrypting or validation fails
 */
export async function downloadSafeBackup(
    credentials: SafeCredentials,
    services: ServicesForSafeBackup,
): Promise<SafeBackupData> {
    const {config, logging} = services;
    const log = logging.logger('backend.safe');
    log.info(`Downloading backup for identity ${credentials.identity}`);

    // Derive keys from credentials
    log.debug(`Deriving backup key`);
    let decrypted;
    {
        const [backupId, encryptionKey] = deriveKey(credentials);
        try {
            const hexBackupId = bytesToHex(backupId);
            log.debug(`Backup ID is ${hexBackupId}`);

            // Download, decrypt, decode
            const encrypted = await fetchBackupBytes(
                hexBackupId,
                config,
                credentials.customSafeServer,
            );
            decrypted = decryptBackupBytes(new Uint8Array(encrypted), encryptionKey, services);
        } finally {
            encryptionKey.purge();
        }
    }
    const decoded = await decodeBackupBytes(decrypted, services);

    let json;
    try {
        json = JSON.parse(decoded);
    } catch (error) {
        throw new SafeError('validation', 'Backup JSON parsing failed', {from: error});
    }
    return validateSafeBackupData(json);
}

function validateSafeBackupData(safeBackupData: unknown): SafeBackupData {
    try {
        return SAFE_SCHEMA.parse(safeBackupData);
    } catch (error) {
        throw new SafeError('validation', 'Backup schema validation failed', {from: error});
    }
}
