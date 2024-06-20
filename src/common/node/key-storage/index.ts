/**
 * The key storage stores essential information about the identity of the user in a protobuf-encoded
 * file. This includes, among other things:
 *
 * - The user's identity and private key
 * - The database encryption key
 * - The device group key
 * - ...
 *
 * # Encoding / Decoding
 *
 * When writing this data, the data is protobuf-encoded using the schema
 * {@link DecryptedKeyStorage}. Then the bytes are encrypted using a key derived from a
 * user-provided password using Argon2 (see {@link Argon2MinParams} for details on the parameters).
 * The encrypted data, along with the key derivation parameters, is then encoded again with
 * protobuf, using the schema {@link EncryptedKeyStorage}. The resulting bytes are written to the
 * key storage file.
 *
 *     Encode(DecryptedKeyStorage) → Encrypt → Encode(EncryptedKeyStorage) → Write
 *
 * When reading the file, this process is done in reverse.
 *
 *     Read -> Decode(EncryptedKeyStorage) -> Decrypt -> Decode(DecryptedKeyStorage)
 *
 * # Versioning / Migrations
 *
 * Versioning and migrations are done on the protobuf level (pre-validation). This is similar to
 * relational databases, where migrations are done on the SQL level, before applying table mappings.
 *
 * When loading protobuf data that does not correspond to the current schema version, migration
 * functions are applied until it corresponds to the current version. Finally, the current
 * validation schema is used to validate the migrated data.
 *
 * To be able to check for version upgrades, both the {@link EncryptedKeyStorage} and
 * {@link DecryptedKeyStorage} protobuf schema contain a "schemaVersion" field. The migration
 * process roughly works like this:
 *
 * 1. Load outer protobuf data: {@link EncryptedKeyStorage}
 * 2. Compare version. If version is not current:
 *    a. Migrate up or down by applying the appropriate migration functions until the current
 *       version is reached
 *    b. Write updated file
 *    c. GOTO 1
 * 3. Decrypt and load inner protobuf data: {@link DecryptedKeyStorage}
 * 4. Compare version. If version is not current:
 *    a. Migrate up or down by applying the appropriate migration functions until the current
 *       version is reached
 *    b. Write updated file
 *    c. GOTO 1
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

import * as argon2 from 'argon2';
import {
    NACL_CONSTANTS,
    NONCE_UNGUARDED_SCOPE,
    type PlainData,
    type RawKey,
    wrapRawKey,
} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import type {ThreemaWorkCredentials} from '~/common/device';
import {TRANSFER_HANDLER} from '~/common/index';
import {
    DecryptedKeyStorage,
    EncryptedKeyStorage,
} from '~/common/internal-protobuf/key-storage-file';
import {
    ARGON2_MIN_PARAMS,
    type Argon2idParameters,
    Argon2Version,
    ENCRYPTED_KEY_STORAGE_FILE_CONTENTS_SCHEMA,
    type EncryptedKeyStorageFileContents,
    KDF_TARGET_RUNTIME_MS,
    KEY_STORAGE_CONTENTS_SCHEMA,
    type KeyStorage,
    type KeyStorageContents,
    KeyStorageError,
    type ServicesForKeyStorage,
    type KeyStorageOppfConfig,
} from '~/common/key-storage';
import type {Logger} from '~/common/logging';
import {fileModeInternalObjectIfPosix} from '~/common/node/fs';
import {KiB, MiB, type ReadonlyUint8Array, type u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {intoUnsignedLong} from '~/common/utils/number';

import {
    DECRYPTED_KEY_STORAGE_SCHEMA_VERSION,
    ENCRYPTED_KEY_STORAGE_SCHEMA_VERSION,
    MigrationHelper,
} from './migrations';

/** @inheritdoc */
export class FileSystemKeyStorage implements KeyStorage {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    /**
     * Create a key storage backed by the file system.
     *
     * @param _keyStoragePath An existing and writable file path the key storage should read from / write to.
     */
    public constructor(
        private readonly _services: ServicesForKeyStorage,
        private readonly _log: Logger,
        private readonly _keyStoragePath: string,
    ) {
        // Ensure that the parent directory exists.
        if (!fs.existsSync(path.dirname(this._keyStoragePath))) {
            throw new KeyStorageError(
                'not-found',
                `Key storage directory ${this._keyStoragePath} does not exist`,
            );
        }
        this._log.debug(`Key storage path: ${this._keyStoragePath}`);
    }

    /** @inheritdoc */
    public isPresent(): boolean {
        return fs.existsSync(this._keyStoragePath);
    }

    /** @inheritdoc */
    public async read(password: string): Promise<KeyStorageContents> {
        this._log.debug('Reading key storage');

        let cachedKdfParams: Argon2idParameters | undefined = undefined;

        const migrationHelper = new MigrationHelper(this._log);

        for (;;) {
            // Read encrypted key storage
            const encryptedKeyStorage = await this._readEncryptedKeyStorage();

            // Migrate encrypted key storage schema
            if (migrationHelper.migrateEncryptedKeyStorage(encryptedKeyStorage)) {
                // Validate migrated encrypted key storage
                try {
                    ENCRYPTED_KEY_STORAGE_FILE_CONTENTS_SCHEMA.parse(encryptedKeyStorage);
                } catch (error) {
                    throw new KeyStorageError(
                        'internal-error',
                        'Encrypted key storage contents do not pass validation after migration',
                        {from: error},
                    );
                }

                // Migrations were applied in-place. Overwrite file and restart loading.
                await this._writeEncryptedKeyStorage(encryptedKeyStorage);
                continue;
            }

            // Decrypt encrypted key storage
            const decryptedKeyStorage = await this._decryptKeyStorage(
                encryptedKeyStorage,
                password,
            );

            // Migrate decrypted key storage schema
            const hasDecryptedKeyStorageBeenMigrated =
                migrationHelper.migrateDecryptedKeyStorage(decryptedKeyStorage);

            // Validate decrypted key storage
            let keyStorageContents: KeyStorageContents;
            try {
                keyStorageContents = KEY_STORAGE_CONTENTS_SCHEMA.parse(decryptedKeyStorage);
            } catch (error) {
                throw new KeyStorageError(
                    'invalid',
                    'Decrypted key storage contents do not pass validation',
                    {from: error},
                );
            }

            // Migrations were applied in-place. Overwrite file and restart loading.
            //
            // Note: Reloading would not be strictly required here, but we do it to ensure that
            //       everything went right with the migration.
            if (hasDecryptedKeyStorageBeenMigrated) {
                if (cachedKdfParams === undefined) {
                    cachedKdfParams = await this._determineKdfParams();
                }
                await this._write(password, keyStorageContents, cachedKdfParams);
                continue;
            }

            this._log.info(
                `Key storage loaded from file (schema versions: encrypted=${encryptedKeyStorage.schemaVersion} decrypted=${decryptedKeyStorage.schemaVersion})`,
            );
            return keyStorageContents;
        }
    }

    /** @inheritdoc */
    public async write(password: string, contents: KeyStorageContents): Promise<void> {
        // Determine DKF params
        const kdfParams = await this._determineKdfParams();

        // Write file
        await this._write(password, contents, kdfParams);
    }

    /** @inheritdoc */
    public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const content = await this.read(currentPassword);
        await this.write(newPassword, content);
    }

    /** @inheritdoc */
    public async changeWorkCredentials(
        password: string,
        workCredentials: ThreemaWorkCredentials,
    ): Promise<void> {
        const oldContent = await this.read(password);
        const newContent = {...oldContent, workCredentials: {...workCredentials}};
        await this.write(password, newContent);
    }

    /** @inheritdoc */
    public async changeCachedOnPremConfig(
        password: string,
        newConfig: KeyStorageOppfConfig,
    ): Promise<void> {
        const oldContent = await this.read(password);
        const newContent: KeyStorageContents = {
            ...oldContent,
            onPremConfig: {...newConfig},
        };
        await this.write(password, newContent);
    }

    private async _write(
        password: string,
        contents: KeyStorageContents,
        kdfParams: Argon2idParameters,
    ): Promise<void> {
        // Encode and encrypt key storage
        const encryptedKeyStorage = await this._encryptKeyStorage(contents, password, kdfParams);

        // Write (or overwrite) key storage file
        await this._writeEncryptedKeyStorage(encryptedKeyStorage);
    }

    /**
     * Determine the Argon2id KDF parameters to be used when encrypting the key storage.
     *
     * This function uses a benchmark and might take a few seconds to run. Do not call it more often
     * than necessary!
     */
    private async _determineKdfParams(): Promise<Argon2idParameters> {
        // Version: 1.3
        const version = Argon2Version.fromArgon2VersionByte(0x13);

        // Minimal parameters, see docs for {@link ARGON2_MIN_PARAMS}
        const minParameters = ARGON2_MIN_PARAMS.create;

        // Run a benchmark to determine the number of iterations.
        this._log.debug(
            `Benchmark starting: m=${minParameters.memoryBytes / MiB}M t=${
                minParameters.iterations
            } p=${minParameters.parallelism}`,
        );
        const benchmarkPassword = 'r3gGN9GDQ5NF6tM6';
        const start = performance.now();
        await this._deriveKey(benchmarkPassword, {
            version,
            salt: this._services.crypto.randomBytes(new Uint8Array(minParameters.saltLengthBytes)),
            memoryBytes: minParameters.memoryBytes,
            iterations: minParameters.iterations,
            parallelism: minParameters.parallelism,
        });
        const end = performance.now();
        const duration = end - start;
        this._log.debug(`Benchmark completed in ${duration.toFixed(2)} ms`);

        // Determine actual parameters by first extrapolating `memory`
        // then `iterations`. Ensure that the parameters cannot be weakened!

        // First, increase memory
        let memoryBytes = minParameters.memoryBytes;
        const runtimeRatio = KDF_TARGET_RUNTIME_MS.target / duration;
        let extrapolatedDuration = duration;
        let factor = 1;
        if (runtimeRatio > 4) {
            factor = 4; // 128 MiB -> 512 MiB
        } else if (runtimeRatio > 2) {
            factor = 2; // 128 MiB -> 256 MiB
        }
        memoryBytes *= factor;
        extrapolatedDuration *= factor;

        // Then increase iterations
        const iterations = Math.max(
            minParameters.iterations,
            Math.round(
                (minParameters.iterations / extrapolatedDuration) * KDF_TARGET_RUNTIME_MS.target,
            ),
        );
        const parallelism = minParameters.parallelism;
        this._log.debug(
            `Benchmark result: m=${memoryBytes / MiB}M t=${iterations} p=${parallelism}`,
        );

        // Random salt
        const salt = this._services.crypto.randomBytes(
            new Uint8Array(minParameters.saltLengthBytes),
        );

        // Sanity-check parameters
        const parameters = {
            version,
            salt,
            memoryBytes,
            iterations,
            parallelism,
        };
        assert(
            parameters.iterations >= minParameters.iterations &&
                parameters.memoryBytes >= minParameters.memoryBytes &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                parameters.parallelism >= minParameters.parallelism,
            'Expected KDF parameters to fulfill the minimum requirements',
        );

        return parameters;
    }

    /**
     * Derive a key from a low-entropy password using Argon2id.
     *
     * If `runtimeWarnBounds` is set, then a KDF runtime outside the
     * specified bounds will result in a warning being logged.
     */
    private async _deriveKey(
        password: string,
        params: Argon2idParameters,
        runtimeWarnBounds?: {min: u53; max: u53},
    ): Promise<RawKey<32>> {
        // Run KDF
        const start = performance.now();
        const rawHash = await argon2.hash(password, {
            // Use Argon2id variant
            type: argon2.argon2id,
            // The version to use
            version: params.version.toArgon2VersionByte(),
            // We need 32 bytes (NaCl secret key)
            hashLength: NACL_CONSTANTS.KEY_LENGTH,
            // Salt / nonce
            salt: Buffer.from(params.salt),
            // Number of iterations
            timeCost: params.iterations,
            // The amount of memory to be used by the hash function, in KiB
            memoryCost: Math.floor(params.memoryBytes / KiB),
            // Degree of parallelism
            parallelism: params.parallelism,
            // Return raw hash, not a digest with parameters
            raw: true,
        });
        const duration = performance.now() - start;
        const msg = `KDF ran in ${duration.toFixed(2)} ms`;
        if (
            runtimeWarnBounds !== undefined &&
            (duration < runtimeWarnBounds.min || duration > runtimeWarnBounds.max)
        ) {
            this._log.warn(msg);
        } else {
            this._log.debug(msg);
        }
        return wrapRawKey(rawHash, NACL_CONSTANTS.KEY_LENGTH);
    }

    /**
     * Read and decode the encrypted key storage file.
     *
     * Note: The key storage is not yet validated. The function ensures that the
     * key storage file is not empty, but – as an example – the KDF parameters may
     * be missing from the file. Full validation happens in the
     * {@link _decryptKeyStorage} method.
     *
     * @throws {KeyStorageError} In case reading or decoding the key storage fails.
     */
    private async _readEncryptedKeyStorage(): Promise<EncryptedKeyStorage> {
        // Look up key storage file
        if (!this.isPresent()) {
            throw new KeyStorageError(
                'not-found',
                `Key storage file at ${this._keyStoragePath} does not exist`,
            );
        }

        // Read file content
        let fileContents: Buffer;
        try {
            fileContents = await fsPromises.readFile(this._keyStoragePath);
        } catch (error) {
            throw new KeyStorageError(
                'not-readable',
                `Key storage file at ${this._keyStoragePath} cannot be read`,
                {from: error},
            );
        }

        // Ensure that file is not empty
        if (fileContents.byteLength === 0) {
            throw new KeyStorageError(
                'malformed',
                `Key storage file at ${this._keyStoragePath} is empty`,
            );
        }

        // Decode file contents
        let keyStorageFile: EncryptedKeyStorage;
        try {
            keyStorageFile = EncryptedKeyStorage.decode(fileContents);
        } catch (error) {
            throw new KeyStorageError('malformed', `Cannot decode encrypted key storage file`, {
                from: error,
            });
        }

        return keyStorageFile;
    }

    /**
     * Encode and write the encrypted key storage file.
     *
     * @throws {KeyStorageError} In case writing the key storage fails.
     */
    private async _writeEncryptedKeyStorage(
        encryptedKeyStorage: EncryptedKeyStorage,
    ): Promise<void> {
        // Encode
        const encryptedKeyStorageBytes = EncryptedKeyStorage.encode(encryptedKeyStorage).finish();

        // Write file
        try {
            const options = {...fileModeInternalObjectIfPosix()};
            await fsPromises.writeFile(this._keyStoragePath, encryptedKeyStorageBytes, options);
        } catch (error) {
            throw new KeyStorageError(
                'not-writable',
                `Key storage file at ${this._keyStoragePath} cannot be written`,
                {from: error},
            );
        }
    }

    /**
     * Decrypt and decode the encrypted key storage.
     *
     * @throws {KeyStorageError} In case validation or decryption of the key storage failed.
     */
    private async _decryptKeyStorage(
        encryptedKeyStorage: EncryptedKeyStorage,
        password: string,
    ): Promise<DecryptedKeyStorage> {
        const {crypto} = this._services;

        // Validate encrypted key storage
        let validatedEncryptedKeyStorage: EncryptedKeyStorageFileContents;
        try {
            validatedEncryptedKeyStorage =
                ENCRYPTED_KEY_STORAGE_FILE_CONTENTS_SCHEMA.parse(encryptedKeyStorage);
        } catch (error) {
            throw new KeyStorageError(
                'invalid',
                `Encrypted key storage contents do not pass validation`,
                {from: error},
            );
        }

        // Decrypt
        const key = await this._deriveKey(
            password,
            validatedEncryptedKeyStorage.kdfParameters.argon2id,
            KDF_TARGET_RUNTIME_MS,
        );
        const secretBox = crypto.getSecretBox(key.asReadonly(), NONCE_UNGUARDED_SCOPE, undefined);
        const decryptor = secretBox.decryptorWithNonceAhead(
            CREATE_BUFFER_TOKEN,
            validatedEncryptedKeyStorage.encryptedKeyStorage,
        );
        let decryptedBytes: Uint8Array;
        try {
            decryptedBytes = decryptor.decrypt(undefined).plainData;
        } catch (error) {
            throw new KeyStorageError('undecryptable', `Cannot decrypt encrypted key storage`, {
                from: error,
            });
        }
        key.purge();

        // Decode
        let decryptedKeyStorage: DecryptedKeyStorage;
        try {
            decryptedKeyStorage = DecryptedKeyStorage.decode(decryptedBytes);
        } catch (error) {
            throw new KeyStorageError('malformed', `Cannot decode decrypted key storage`, {
                from: error,
            });
        }

        return decryptedKeyStorage;
    }

    /**
     * Encode and encrypt the decrypted key storage.
     *
     * @throws {KeyStorageError} In case encrypting the key storage fails.
     */
    private async _encryptKeyStorage(
        decryptedKeyStorage: KeyStorageContents,
        password: string,
        kdfParameters: Argon2idParameters,
    ): Promise<EncryptedKeyStorage> {
        const {crypto} = this._services;

        // Validate
        if (decryptedKeyStorage.schemaVersion !== DECRYPTED_KEY_STORAGE_SCHEMA_VERSION) {
            throw new KeyStorageError(
                'internal-error',
                'Schema version of the decrypted key storage does not match DECRYPTED_KEY_STORAGE_SCHEMA_VERSION',
            );
        }

        // Encrypt
        const key = await this._deriveKey(password, kdfParameters, KDF_TARGET_RUNTIME_MS);
        const encryptedKeyStorageBytes = crypto
            .getSecretBox(key.asReadonly(), NONCE_UNGUARDED_SCOPE, undefined)
            .encryptor(
                CREATE_BUFFER_TOKEN,
                DecryptedKeyStorage.encode({
                    schemaVersion: decryptedKeyStorage.schemaVersion,
                    identityData: {
                        identity: decryptedKeyStorage.identityData.identity,
                        ck: decryptedKeyStorage.identityData.ck.unwrap() as ReadonlyUint8Array as Uint8Array,
                        serverGroup: decryptedKeyStorage.identityData.serverGroup,
                        deprecatedServerGroup: 0,
                    },
                    dgk: decryptedKeyStorage.dgk.unwrap() as ReadonlyUint8Array as Uint8Array,
                    databaseKey:
                        decryptedKeyStorage.databaseKey.unwrap() as ReadonlyUint8Array as Uint8Array,
                    deviceIds: {
                        d2mDeviceId: intoUnsignedLong(decryptedKeyStorage.deviceIds.d2mDeviceId),
                        cspDeviceId: intoUnsignedLong(decryptedKeyStorage.deviceIds.cspDeviceId),
                    },
                    // TODO(DESK-1344) Make this mandatory.
                    deviceCookie:
                        decryptedKeyStorage.deviceCookie !== undefined
                            ? (decryptedKeyStorage.deviceCookie as ReadonlyUint8Array as Uint8Array)
                            : undefined,
                    workCredentials: decryptedKeyStorage.workCredentials,
                    onPremConfig:
                        import.meta.env.BUILD_ENVIRONMENT === 'onprem' &&
                        decryptedKeyStorage.onPremConfig !== undefined
                            ? {
                                  oppfUrl: decryptedKeyStorage.onPremConfig.oppfUrl,
                                  lastUpdated: intoUnsignedLong(
                                      decryptedKeyStorage.onPremConfig.lastUpdated,
                                  ),
                                  oppfCachedConfig:
                                      decryptedKeyStorage.onPremConfig.oppfCachedConfig,
                              }
                            : undefined,
                }).finish() as PlainData,
            )
            .encryptWithRandomNonceAhead(undefined);
        key.purge();

        // Encode
        return {
            schemaVersion: ENCRYPTED_KEY_STORAGE_SCHEMA_VERSION,
            encryptedKeyStorage: encryptedKeyStorageBytes,
            kdfParameters: {
                $case: 'argon2id',
                argon2id: {
                    version: kdfParameters.version.toProtobuf(),
                    salt: kdfParameters.salt,
                    memoryBytes: kdfParameters.memoryBytes,
                    iterations: kdfParameters.iterations,
                    parallelism: kdfParameters.parallelism,
                },
            },
        };
    }
}
