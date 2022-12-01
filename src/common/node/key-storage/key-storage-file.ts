/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal';

export interface EncryptedKeyStorage {
    /** The key storage schema version. Used for being able to migrate the storage format. */
    schemaVersion: number;
    /**
     * Contains the key storage (`KeyStorage`), encrypted and encoded in the
     * following way:
     *
     * 1. Let `plain_storage` be the plaintext `KeyStorage`, encoded to bytes.
     * 2. Let `sk` be a 32 byte secret key derived by running the chosen KDF
     *    with its parameters and the user-provided passphrase.
     * 3. Let `nonce` be a random nonce.
     * 4. Let `encrypted_storage` be the result of an NaCl box encryption with
     *    `sk` as the secret key, `nonce` as the nonce and `plain_storage` as
     *    data.
     * 5. Set `encrypted_key_storage` to `nonce || encrypted_storage` (i.e. a
     *    `extra.crypto.encrypted-data-with-nonce-ahead` struct).
     */
    encryptedKeyStorage: Uint8Array;
    kdfParameters?: {$case: 'argon2id'; argon2id: EncryptedKeyStorage_Argon2idParameters};
}

/**
 * Argon2id parameters.
 *
 * We currently recommend to use the following minimum parameter values:
 *
 * - Memory: At least 128 MiB
 * - Iterations: At least 3
 *
 * Ideally, the parameters are tuned for the system in the following way:
 *
 * 1. Choose a maximum `time` the algorithm should run. For our use case,
 *    ~2s at application startup are acceptable.
 * 2. Figure out the an appropriate `memory` value based on weak target
 *    hardware.
 * 3. Run Argon2id and increase the number of `memory` and `iterations`
 *    until the targeted `time` is roughly matched.
 */
export interface EncryptedKeyStorage_Argon2idParameters {
    version: EncryptedKeyStorage_Argon2idParameters_Argon2Version;
    /** Random salt (≥ 16 bytes, recommended to be 16 bytes) */
    salt: Uint8Array;
    /** Memory usage in bytes (≥ 128 MiB) */
    memoryBytes: number;
    /** Number of iterations (≥ 3) */
    iterations: number;
    /** Amount of parallelism (≥ 1, recommended to be 1) */
    parallelism: number;
}

/** Version of Argon2 */
export const enum EncryptedKeyStorage_Argon2idParameters_Argon2Version {
    VERSION_1_3 = 0,
    UNRECOGNIZED = -1,
}

export interface IdentityData {
    /** The Threema ID string */
    identity: string;
    /** The permanent client key associated to the Threema ID (32 bytes) */
    ck: Uint8Array;
    /** Deprecated numeric server group */
    deprecatedServerGroup: number;
    /** The server group associated to the Threema ID (1 byte) */
    serverGroup: string;
}

export interface DeviceIds {
    /** The device ID used towards the mediator server */
    d2mDeviceId: Long;
    /** The device ID used towards the chat server */
    cspDeviceId: Long;
}

export interface DecryptedKeyStorage {
    /** The key storage schema version. Used for being able to migrate the storage format. */
    schemaVersion: number;
    /** Data associated to the Threema ID */
    identityData: IdentityData | undefined;
    /** The device group key (32 bytes) */
    dgk: Uint8Array;
    /** The SQLCipher database encryption key (32 bytes) */
    databaseKey: Uint8Array;
    /** Device IDs */
    deviceIds: DeviceIds | undefined;
}

function createBaseEncryptedKeyStorage(): EncryptedKeyStorage {
    return {schemaVersion: 0, encryptedKeyStorage: new Uint8Array(), kdfParameters: undefined};
}

export const EncryptedKeyStorage = {
    encode(message: EncryptedKeyStorage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.schemaVersion !== 0) {
            writer.uint32(24).uint32(message.schemaVersion);
        }
        if (message.encryptedKeyStorage.length !== 0) {
            writer.uint32(10).bytes(message.encryptedKeyStorage);
        }
        if (message.kdfParameters?.$case === 'argon2id') {
            EncryptedKeyStorage_Argon2idParameters.encode(
                message.kdfParameters.argon2id,
                writer.uint32(18).fork(),
            ).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EncryptedKeyStorage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEncryptedKeyStorage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 3:
                    message.schemaVersion = reader.uint32();
                    break;
                case 1:
                    message.encryptedKeyStorage = reader.bytes();
                    break;
                case 2:
                    message.kdfParameters = {
                        $case: 'argon2id',
                        argon2id: EncryptedKeyStorage_Argon2idParameters.decode(
                            reader,
                            reader.uint32(),
                        ),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseEncryptedKeyStorage_Argon2idParameters(): EncryptedKeyStorage_Argon2idParameters {
    return {version: 0, salt: new Uint8Array(), memoryBytes: 0, iterations: 0, parallelism: 0};
}

export const EncryptedKeyStorage_Argon2idParameters = {
    encode(
        message: EncryptedKeyStorage_Argon2idParameters,
        writer: _m0.Writer = _m0.Writer.create(),
    ): _m0.Writer {
        if (message.version !== 0) {
            writer.uint32(8).int32(message.version);
        }
        if (message.salt.length !== 0) {
            writer.uint32(18).bytes(message.salt);
        }
        if (message.memoryBytes !== 0) {
            writer.uint32(24).uint32(message.memoryBytes);
        }
        if (message.iterations !== 0) {
            writer.uint32(32).uint32(message.iterations);
        }
        if (message.parallelism !== 0) {
            writer.uint32(40).uint32(message.parallelism);
        }
        return writer;
    },

    decode(
        input: _m0.Reader | Uint8Array,
        length?: number,
    ): EncryptedKeyStorage_Argon2idParameters {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEncryptedKeyStorage_Argon2idParameters();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.version = reader.int32() as any;
                    break;
                case 2:
                    message.salt = reader.bytes();
                    break;
                case 3:
                    message.memoryBytes = reader.uint32();
                    break;
                case 4:
                    message.iterations = reader.uint32();
                    break;
                case 5:
                    message.parallelism = reader.uint32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseIdentityData(): IdentityData {
    return {identity: '', ck: new Uint8Array(), deprecatedServerGroup: 0, serverGroup: ''};
}

export const IdentityData = {
    encode(message: IdentityData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.identity !== '') {
            writer.uint32(10).string(message.identity);
        }
        if (message.ck.length !== 0) {
            writer.uint32(18).bytes(message.ck);
        }
        if (message.deprecatedServerGroup !== 0) {
            writer.uint32(24).uint32(message.deprecatedServerGroup);
        }
        if (message.serverGroup !== '') {
            writer.uint32(34).string(message.serverGroup);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): IdentityData {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseIdentityData();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.identity = reader.string();
                    break;
                case 2:
                    message.ck = reader.bytes();
                    break;
                case 3:
                    message.deprecatedServerGroup = reader.uint32();
                    break;
                case 4:
                    message.serverGroup = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseDeviceIds(): DeviceIds {
    return {d2mDeviceId: Long.UZERO, cspDeviceId: Long.UZERO};
}

export const DeviceIds = {
    encode(message: DeviceIds, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (!message.d2mDeviceId.isZero()) {
            writer.uint32(8).uint64(message.d2mDeviceId);
        }
        if (!message.cspDeviceId.isZero()) {
            writer.uint32(16).uint64(message.cspDeviceId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): DeviceIds {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDeviceIds();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.d2mDeviceId = reader.uint64() as Long;
                    break;
                case 2:
                    message.cspDeviceId = reader.uint64() as Long;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

function createBaseDecryptedKeyStorage(): DecryptedKeyStorage {
    return {
        schemaVersion: 0,
        identityData: undefined,
        dgk: new Uint8Array(),
        databaseKey: new Uint8Array(),
        deviceIds: undefined,
    };
}

export const DecryptedKeyStorage = {
    encode(message: DecryptedKeyStorage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.schemaVersion !== 0) {
            writer.uint32(40).uint32(message.schemaVersion);
        }
        if (message.identityData !== undefined) {
            IdentityData.encode(message.identityData, writer.uint32(10).fork()).ldelim();
        }
        if (message.dgk.length !== 0) {
            writer.uint32(18).bytes(message.dgk);
        }
        if (message.databaseKey.length !== 0) {
            writer.uint32(26).bytes(message.databaseKey);
        }
        if (message.deviceIds !== undefined) {
            DeviceIds.encode(message.deviceIds, writer.uint32(34).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): DecryptedKeyStorage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDecryptedKeyStorage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 5:
                    message.schemaVersion = reader.uint32();
                    break;
                case 1:
                    message.identityData = IdentityData.decode(reader, reader.uint32());
                    break;
                case 2:
                    message.dgk = reader.bytes();
                    break;
                case 3:
                    message.databaseKey = reader.bytes();
                    break;
                case 4:
                    message.deviceIds = DeviceIds.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

if (_m0.util.Long !== Long) {
    _m0.util.Long = Long as any;
    _m0.configure();
}
