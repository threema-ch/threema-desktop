import * as v from '@badrap/valita';

import {type ServicesForBackend} from '~/common/backend';
import {ensureEncryptedDataWithNonceAhead} from '~/common/crypto';
import {wrapRawDatabaseKey} from '~/common/db';
import {TransferTag} from '~/common/enum';
import {BaseError, type BaseErrorOptions} from '~/common/error';
import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureIdentityString,
    ensureServerGroup,
} from '~/common/network/types';
import {wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {EncryptedKeyStorage_Argon2idParameters_Argon2Version} from '~/common/node/key-storage/key-storage-file';
import {KiB, MiB, type u8, type u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {registerErrorTransferHandler, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

/**
 * Specify the target runtime for the KDF, as well as upper and
 * lower bounds for generating warnings (if the KDF runs slower or faster).
 */
export const KDF_TARGET_RUNTIME_MS = {
    min: 1000,
    target: 2000,
    max: 3000,
} as const;

/**
 * Argon2 minimal parameters.
 *
 * There are always two sets of parameters: The absolute minimum (validated when
 * reading a key storage) and the current minimum (used when generating a new
 * key storage).
 *
 * The minimal parameters aim to provide reasonable security even against GPU
 * based attacks, but may be increased in difficulty using a benchmark (see
 * {@link FileKeyStorage._determineKdfParams}). On old or very weak hardware these
 * parameters may exceed our goal of 2 seconds, but should still be usable (the
 * KDF will run every time the application is opened).
 *
 * To test this with the `argon2` command line program:
 *
 *     echo "pw" | argon2 asdfjklo -id -v 13 -t 3 -k $((1024*128)) -p 1
 *
 * With these parameters, the following runtimes on desktop / server hardware
 * are achieved:
 *
 * - AMD Ryzen 9 5900X: 0.207 s
 * - Intel Xeon 6140:   0.748 s
 * - Intel Atom D525:   3.526 s
 *
 * For comparison, here are some smartphones (tested with the argon2kt app):
 *
 * - Snapdragon 835 (Xiaomi Mi 6): 0.584 s
 * - Snapdragon 670 (Pixel 3a):    0.618 s
 * - Snapdragon 400 (Moto G):      4.875 s
 * - MediaTek 6589M (Fairphone 1): 3.431 s
 *
 * And on ARM based SBCs:
 *
 * - Raspberry Pi Zero W: 6.473 s
 */
export interface Argon2MinParams {
    readonly saltLengthBytes: u53;
    readonly memoryBytes: u53;
    readonly iterations: u53;
    readonly parallelism: u53;
}
export const ARGON2_MIN_PARAMS: {
    accept: Argon2MinParams;
    create: Argon2MinParams;
} = {
    accept: {
        saltLengthBytes: 16,
        memoryBytes: 128 * MiB,
        iterations: 3,
        parallelism: 1,
    },
    create: {
        saltLengthBytes: 16,
        memoryBytes: 128 * MiB,
        iterations: 3,
        parallelism: 1,
    },
};

/**
 * The Argon2 version wrapper.
 *
 * Right now, only version 1.3 (0x13) is supported.
 */
export class Argon2Version {
    private constructor(private readonly _versionByte: 0x13) {}

    /**
     * Create an {@link Argon2Version} instance from an argon2 compatible version byte.
     */
    public static fromArgon2VersionByte(hexVersionByte: 0x13): Argon2Version {
        return new Argon2Version(hexVersionByte);
    }

    /**
     * Create an {@link Argon2Version} instance from a protobuf
     * {@link EncryptedKeyStorage_Argon2idParameters_Argon2Version} instance.
     *
     * @throws {Error} In case of an unsupported Argon2 version.
     */
    public static fromProtobuf(
        version: EncryptedKeyStorage_Argon2idParameters_Argon2Version,
    ): Argon2Version {
        switch (version) {
            case EncryptedKeyStorage_Argon2idParameters_Argon2Version.UNRECOGNIZED:
                throw new Error(`Unrecognized Argon2 version in protobuf data`);
            case EncryptedKeyStorage_Argon2idParameters_Argon2Version.VERSION_1_3:
                return new Argon2Version(0x13);
            default:
                return unreachable(
                    version,
                    new Error(`Unknown Argon2 version ${version} in protobuf data`),
                );
        }
    }

    /**
     * Return the version as supported by the `argon2` library.
     */
    public toArgon2VersionByte(): u8 {
        return this._versionByte;
    }

    /**
     * Return the version as {@link EncryptedKeyStorage_Argon2idParameters_Argon2Version}.
     */
    public toProtobuf(): EncryptedKeyStorage_Argon2idParameters_Argon2Version {
        switch (this._versionByte) {
            case 0x13:
                return EncryptedKeyStorage_Argon2idParameters_Argon2Version.VERSION_1_3;
            default:
                return unreachable(this._versionByte);
        }
    }
}

/**
 * Validation schema for the Argon2id parameters in the encrypted key storage file contents.
 *
 * @throws {ValitaError} In case validation fails.
 */
const ARGON2ID_PARAMETERS_SCHEMA = v.object({
    // Argon implementation version
    version: v.number().map(Argon2Version.fromProtobuf),
    // Random salt
    salt: instanceOf(Uint8Array).assert(
        (salt) => salt.byteLength >= ARGON2_MIN_PARAMS.accept.saltLengthBytes,
        `Argon2id salt must be ≥ ${ARGON2_MIN_PARAMS.accept.saltLengthBytes} bytes`,
    ),
    // Memory usage in bytes
    memoryBytes: v
        .number()
        .assert(
            (memoryBytes) => memoryBytes >= import.meta.env.ARGON2_MIN_MEMORY_BYTES,
            `Argon2id memoryBytes must be ≥ ${Math.round(
                import.meta.env.ARGON2_MIN_MEMORY_BYTES / KiB,
            )} KiB`,
        ),
    // Number of iterations
    iterations: v
        .number()
        .assert(
            (iterations) => iterations >= ARGON2_MIN_PARAMS.accept.iterations,
            `Argon2id iterations must be ≥ ${ARGON2_MIN_PARAMS.accept.iterations}`,
        ),
    // Amount of parallelism
    parallelism: v
        .number()
        .assert(
            (parallelism) => parallelism >= ARGON2_MIN_PARAMS.accept.parallelism,
            `Argon2id parallelism must be ≥ ${ARGON2_MIN_PARAMS.accept.parallelism}`,
        ),
});
/**
 * Validated Argon2id parameters.
 */
export type Argon2idParameters = Readonly<v.Infer<typeof ARGON2ID_PARAMETERS_SCHEMA>>;

/**
 * Validation schema for the encrypted key storage file contents.
 *
 * @throws {KeyStorageError} In case of invalid Argon2 parameters.
 * @throws {ValitaError} In case validation fails.
 */
export const ENCRYPTED_KEY_STORAGE_FILE_CONTENTS_SCHEMA = v
    .object({
        // Current schema version
        schemaVersion: v.literal(1),

        // Encrypted key storage bytes
        encryptedKeyStorage: instanceOf(Uint8Array).map(ensureEncryptedDataWithNonceAhead),

        // Encryption parameters
        kdfParameters: v.object({
            $case: v.literal('argon2id'),
            argon2id: ARGON2ID_PARAMETERS_SCHEMA,
        }),
    })
    .rest(v.unknown());

/**
 * Validated encrypted key storage file contents.
 */
export type EncryptedKeyStorageFileContents = Readonly<
    v.Infer<typeof ENCRYPTED_KEY_STORAGE_FILE_CONTENTS_SCHEMA>
>;

/**
 * Validation schema for the decrypted key storage contents.
 *
 * Note: It's important that all objects are annotated with `.rest(v.unknown())` to ensure forwards
 * compatibility!
 *
 * @throws {ValitaError} In case validation fails.
 */
export const KEY_STORAGE_CONTENTS_SCHEMA = v
    .object({
        // Current schema version
        schemaVersion: v.literal(2),

        // Identity related information
        identityData: v
            .object({
                identity: v.string().map(ensureIdentityString),
                ck: instanceOf(Uint8Array).map(wrapRawClientKey),
                serverGroup: v.string().map(ensureServerGroup),
            })
            .rest(v.unknown()),
        dgk: instanceOf(Uint8Array).map(wrapRawDeviceGroupKey),
        databaseKey: instanceOf(Uint8Array).map(wrapRawDatabaseKey),
        deviceIds: v
            .object({
                d2mDeviceId: unsignedLongAsU64().map(ensureD2mDeviceId),
                cspDeviceId: unsignedLongAsU64().map(ensureCspDeviceId),
            })
            .rest(v.unknown()),
    })
    .rest(v.unknown());

/**
 * Validated key storage contents.
 */
export type KeyStorageContents = Readonly<v.Infer<typeof KEY_STORAGE_CONTENTS_SCHEMA>>;

/** Services required by the key storage factory. */
export type ServicesForKeyStorageFactory = Pick<ServicesForBackend, 'config' | 'crypto'>;

/** Services required by the key storage. */
export type ServicesForKeyStorage = Pick<ServicesForBackend, 'crypto'>;

/**
 * Stores and retrieves secret keys securely.
 */
export interface KeyStorage {
    /**
     * Check if the key storage file is present in the file system. If not, there is no identity set
     * up for the app and the initial setup process should be probably triggered.
     */
    readonly isPresent: () => boolean;

    /**
     * Read, decrypt and decode the key storage file in the file system and
     * return a {@link KeyStorageContents} object.
     *
     * @throws {KeyStorageError} In case reading, validating or decrypting the
     *   key storage fails.
     */
    readonly read: (password: string) => Promise<KeyStorageContents>;

    /**
     * Write the key storage file to the file system.
     *
     * @throws {KeyStorageError} In case encrypting or writing the key storage
     *   fails.
     */
    readonly write: (password: string, contents: KeyStorageContents) => Promise<void>;
}

/**
 * Type of the {@link KeyStorageError}.
 *
 * - not-found: Key storage or key storage directory cannot be found.
 * - not-readable: Key storage is not readable.
 * - not-writable: Key storage is not writable.
 * - malformed: Key storage is malformed (e.g. non-protobuf contents).
 * - undecryptable: Key storage cannot be decrypted.
 * - invalid: Key storage validation fails after decrypting / decoding.
 * - internal-error: An internal error occurred during loading or writing of the key storage.
 */
export type KeyStorageErrorType =
    | 'not-found'
    | 'not-readable'
    | 'not-writable'
    | 'malformed'
    | 'undecryptable'
    | 'invalid'
    | 'internal-error';

const KEY_STORAGE_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    KeyStorageError,
    TransferTag.KEY_STORAGE_ERROR,
    [type: KeyStorageErrorType]
>({
    tag: TransferTag.KEY_STORAGE_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new KeyStorageError(type, message, {from: cause}),
});

/**
 * Errors related to reading, decrypting and decoding a {@link KeyStorage}.
 */
export class KeyStorageError extends BaseError {
    public [TRANSFER_HANDLER] = KEY_STORAGE_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: KeyStorageErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}
