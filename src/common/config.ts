import {
    ensurePublicKey,
    type Ed25519PublicKey,
    type PublicKey,
    ensureEd25519PublicKey,
} from '~/common/crypto';
import type * as oppf from '~/common/dom/backend/onprem/oppf';
import type {BlobIdString} from '~/common/network/protocol/blob';
import {
    ensureBaseUrl,
    type BaseUrl,
    type ValidateUrlProperties,
    validateUrl,
} from '~/common/network/types';
import type {u16, u32, u53} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import {base64ToU8a} from '~/common/utils/base64';
import {byteToHex} from '~/common/utils/byte';
import {applyVariables} from '~/common/utils/string';

/**
 * General project configuration.
 */
export interface Config {
    /**
     * The chat server's public permanent key.
     */
    readonly CHAT_SERVER_KEY: PublicKey;

    /**
     * Mediator server URL.
     */
    readonly mediatorServerUrl: (dgpk: PublicKey) => BaseUrl;

    /**
     * Minimum byte length of a mediator frame (i.e. just the common header).
     */
    readonly MEDIATOR_FRAME_MIN_BYTE_LENGTH: u32;

    /**
     * Maximum byte length of a mediator frame (i.e. common header plus payload).
     */
    readonly MEDIATOR_FRAME_MAX_BYTE_LENGTH: u32;

    /**
     * Delay until a reconnection attempt towards the mediator server may be made.
     */
    readonly MEDIATOR_RECONNECTION_DELAY_S: u53;

    /**
     * Directory server URL.
     */
    readonly DIRECTORY_SERVER_URL: BaseUrl;

    /**
     * Blob server URLs.
     */
    readonly BLOB_SERVER_URLS: {
        readonly upload: (dgpk: PublicKey) => URL;
        readonly download: (dgpk: PublicKey, blobId: BlobIdString) => URL;
        readonly done: (dgpk: PublicKey, blobId: BlobIdString) => URL;
    };

    /**
     * Safe server URL.
     */
    // TODO(DESK-222): Use `SafeBackupIdString` instead of `string`
    readonly safeServerUrl: (backupId: string) => BaseUrl;

    /**
     * Rendezvous server URL.
     */
    readonly rendezvousServerUrl: (rendezvousPathHex: string) => BaseUrl;

    /**
     * Update server URL.
     */
    readonly UPDATE_SERVER_URL: BaseUrl;

    /**
     * Work server URL.
     */
    readonly WORK_SERVER_URL: BaseUrl;

    /**
     * Maximum amount of packets to be displayed.
     */
    readonly DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: u16;

    /**
     * Key storage path (relative to the app's data directory).
     */
    readonly KEY_STORAGE_PATH: readonly string[];

    /**
     * File storage directory path (relative to the app's data directory).
     */
    readonly FILE_STORAGE_PATH: readonly string[];

    /**
     * Database path (relative to the app's data directory) or the magic string `:memory:` (creating
     * an in-memory database).
     */
    readonly DATABASE_PATH: readonly string[] | ':memory:';

    // Note: User agent will not currently be applied by Chromium when doing calls from the DOM
    //       context. Instead, the default Electron user agent will be used. See
    //       https://bugs.chromium.org/p/chromium/issues/detail?id=571722
    /**
     * User agent used for network requests.
     */
    readonly USER_AGENT: string;

    // Trusted OnPrem config public signature keys
    readonly ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS: readonly Ed25519PublicKey[];
}

function applyVariablesToUrl(
    url: string,
    variables: Record<string, string>,
    protocol: NonNullable<ValidateUrlProperties['protocol']>,
): URL {
    return validateUrl(applyVariables(url, variables), {
        protocol,
        search: 'deny',
        hash: 'deny',
    });
}

function applyVariablesToBaseUrl(
    url: string,
    variables: Record<string, string>,
    protocol: NonNullable<ValidateUrlProperties['protocol']>,
): BaseUrl {
    return ensureBaseUrl(applyVariables(url, variables), protocol);
}

/**
 * All config properties that are statically configured at build time, no matter if built for OnPrem
 * or not.
 */
export const STATIC_CONFIG: Pick<
    Config,
    | 'MEDIATOR_FRAME_MIN_BYTE_LENGTH'
    | 'MEDIATOR_FRAME_MAX_BYTE_LENGTH'
    | 'MEDIATOR_RECONNECTION_DELAY_S'
    | 'UPDATE_SERVER_URL'
    | 'DEBUG_PACKET_CAPTURE_HISTORY_LENGTH'
    | 'KEY_STORAGE_PATH'
    | 'FILE_STORAGE_PATH'
    | 'DATABASE_PATH'
    | 'USER_AGENT'
    | 'ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS'
> = {
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 5,
    UPDATE_SERVER_URL: ensureBaseUrl(import.meta.env.UPDATE_SERVER_URL, 'https:'),
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: import.meta.env.KEY_STORAGE_PATH,
    FILE_STORAGE_PATH: import.meta.env.FILE_STORAGE_PATH,
    DATABASE_PATH: import.meta.env.DATABASE_PATH,
    USER_AGENT: `Threema Desktop/${import.meta.env.BUILD_VERSION} (${
        import.meta.env.BUILD_VARIANT
    }, ${import.meta.env.BUILD_TARGET})`,
    ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS: import.meta.env.ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS.map(
        (key) => ensureEd25519PublicKey(base64ToU8a(key)),
    ),
};

/**
 * Determine the config from static (determined at build time) and possibly dynamic (determined at
 * runtime) values.
 */
function createConfig(config: {
    readonly CHAT_SERVER_KEY: PublicKey;
    readonly MEDIATOR_SERVER_URL: string;
    readonly DIRECTORY_SERVER_URL: BaseUrl;
    readonly BLOB_SERVER_URLS: {
        readonly upload: (dgpk: PublicKey) => string;
        readonly download: (dgpk: PublicKey) => string;
        readonly done: (dgpk: PublicKey) => string;
    };
    readonly SAFE_SERVER_URL: string;
    readonly RENDEZVOUS_SERVER_URL: string;
    readonly WORK_SERVER_URL: string;
}): Config {
    return {
        ...STATIC_CONFIG,
        CHAT_SERVER_KEY: config.CHAT_SERVER_KEY,
        mediatorServerUrl: (dgpk) => {
            const prefix = byteToHex(unwrap(dgpk[0]));
            return applyVariablesToBaseUrl(
                config.MEDIATOR_SERVER_URL,
                {dgpk4: prefix.slice(0, 1), dgpk8: prefix.slice(0, 2)},
                'wss:',
            );
        },
        DIRECTORY_SERVER_URL: config.DIRECTORY_SERVER_URL,
        BLOB_SERVER_URLS: {
            upload: (dgpk) =>
                validateUrl(config.BLOB_SERVER_URLS.upload(dgpk), {
                    protocol: 'https:',
                    search: 'deny',
                    hash: 'deny',
                }),
            download: (dgpk, blobId) =>
                applyVariablesToUrl(
                    config.BLOB_SERVER_URLS.download(dgpk),
                    {blobIdPrefix: blobId.slice(0, 2), blobId},
                    'https:',
                ),
            done: (dgpk, blobId) =>
                applyVariablesToUrl(
                    config.BLOB_SERVER_URLS.done(dgpk),
                    {blobIdPrefix: blobId.slice(0, 2), blobId},
                    'https:',
                ),
        },
        safeServerUrl: (backupId) =>
            applyVariablesToBaseUrl(config.SAFE_SERVER_URL, {bid8: backupId.slice(0, 2)}, 'https:'),
        rendezvousServerUrl: (rendezvousPathHex: string) =>
            applyVariablesToBaseUrl(
                config.RENDEZVOUS_SERVER_URL,
                {rp4: rendezvousPathHex.slice(0, 1), rp8: rendezvousPathHex.slice(0, 2)},
                'wss:',
            ),
        WORK_SERVER_URL: ensureBaseUrl(config.WORK_SERVER_URL, 'https:'),
    };
}

/**
 * The default configuration, using Threema's server (i.e. non OnPrem).
 */
export function createDefaultConfig(): Config {
    function blobServerUrl(dgpk: PublicKey): string {
        const prefix = byteToHex(unwrap(dgpk[0]));
        return applyVariables(unwrap(import.meta.env.BLOB_SERVER_URL), {
            dgpk4: prefix.slice(0, 1),
            dgpk8: prefix.slice(0, 2),
        });
    }

    return createConfig({
        CHAT_SERVER_KEY: ensurePublicKey(Uint8Array.from(unwrap(import.meta.env.CHAT_SERVER_KEY))),
        MEDIATOR_SERVER_URL: unwrap(import.meta.env.MEDIATOR_SERVER_URL),
        DIRECTORY_SERVER_URL: ensureBaseUrl(unwrap(import.meta.env.DIRECTORY_SERVER_URL), 'https:'),
        BLOB_SERVER_URLS: {
            upload: (dgpk) => `${blobServerUrl(dgpk)}upload`,
            download: (dgpk) => `${blobServerUrl(dgpk)}{blobId}`,
            done: (dgpk) => `${blobServerUrl(dgpk)}{blobId}/done`,
        },
        SAFE_SERVER_URL: unwrap(import.meta.env.SAFE_SERVER_URL),
        RENDEZVOUS_SERVER_URL: unwrap(import.meta.env.RENDEZVOUS_SERVER_URL),
        WORK_SERVER_URL: unwrap(import.meta.env.WORK_SERVER_URL),
    });
}

/**
 * Given an OnPrem Config, creates the corresponding app config.
 *
 * @throws {Error} if not called within an OnPrem build.
 */
export function createConfigFromOppf(onPremConfig: oppf.OppfFile): Config {
    return createConfig({
        CHAT_SERVER_KEY: onPremConfig.chat.publicKey,
        MEDIATOR_SERVER_URL: onPremConfig.mediator.url,
        DIRECTORY_SERVER_URL: onPremConfig.directory.url,
        BLOB_SERVER_URLS: {
            upload: () => onPremConfig.mediator.blob.uploadUrl.toString(),
            download: () => onPremConfig.mediator.blob.downloadUrl,
            done: () => onPremConfig.mediator.blob.doneUrl,
        },
        SAFE_SERVER_URL: onPremConfig.safe.url,
        RENDEZVOUS_SERVER_URL: onPremConfig.rendezvous.url,
        WORK_SERVER_URL: onPremConfig.work.url,
    });
}
