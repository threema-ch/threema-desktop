import * as fs from 'node:fs';

import * as chai from 'chai';

import {NACL_CONSTANTS, NONCE_UNGUARDED_SCOPE, type PlainData, type RawKey} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {DATABASE_KEY_LENGTH, wrapRawDatabaseKey} from '~/common/db';
import {
    DecryptedKeyStorage,
    EncryptedKeyStorage,
    EncryptedKeyStorage_Argon2idParameters_Argon2Version,
} from '~/common/internal-protobuf/key-storage-file';
import {
    ARGON2_MIN_PARAMS,
    type Argon2idParameters,
    Argon2Version,
    type KeyStorageContents,
    KeyStorageError,
    type KeyStorageErrorType,
} from '~/common/key-storage';
import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureIdentityString,
    ensureServerGroup,
} from '~/common/network/types';
import {wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import type {FileSystemKeyStorage} from '~/common/node/key-storage';
import {MiB} from '~/common/types';
import {assert, assertError} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {intoUnsignedLong} from '~/common/utils/number';
import chaiByteEqual from '~/test/common/plugins/byte-equal';
import {MOCK_URL, makeTestFileSystemKeyStorage} from '~/test/mocha/common/backend-mocks';
import {fakeRandomBytes} from '~/test/mocha/common/utils';

const {expect} = chai.use(chaiByteEqual);

/**
 * Key storage tests.
 */
export function run(): void {
    // Crypto backend
    const crypto = new TweetNaClBackend(fakeRandomBytes);

    describe('FileSystemKeyStorage', function () {
        let appPath: string;
        let keyStoragePath: string;
        let keyStorage: FileSystemKeyStorage;

        this.beforeEach(function () {
            const keyStorageDetails = makeTestFileSystemKeyStorage(crypto);
            appPath = keyStorageDetails.appPath;
            keyStoragePath = keyStorageDetails.keyStoragePath;
            keyStorage = keyStorageDetails.keyStorage;
        });

        this.afterEach(function () {
            fs.rmSync(appPath, {recursive: true});
        });

        // ASCII: 46 = '.' / 42 = '*'
        const salt1 = new Uint8Array([
            46, 46, 46, 46, 42, 42, 42, 42, 46, 46, 46, 46, 42, 42, 42, 42,
        ]);
        const salt2 = new Uint8Array([
            42, 46, 42, 46, 42, 46, 42, 46, 42, 46, 42, 46, 42, 46, 42, 46,
        ]);
        const deriveKeyParams = [
            // Params: password, iterations, salt, expected
            //
            // To invoke using the argon2 CLI utility, here's the example for the first param entry:
            //
            // $ echo -n 'supersafe' | argon2 '....****....****' -id -t 25 -k 1024 -p 1
            [
                'supersafe',
                25,
                salt1,
                'c965a5e68a80a03f996de468351dd0c4a66559dc7a7c3662173ecfb82d794d1e',
            ],
            [
                'supersafe',
                50,
                salt1,
                '299f42dd0686da6c2a68064fe493cfc6cdd04d041f4c0172b794dce8b3f32466',
            ],
            [
                'supersafe',
                50,
                salt2,
                '7e2ba8734a4ebc94d4cf8da5dfaaa53b58770106e0e55a422e65216ebc618fce',
            ],
            [
                'verys3cur3',
                50,
                salt1,
                '113dd961e5d4c21ebcbc3135546d4fce4374e01a055b2f57c01b2667db87611a',
            ],
        ] as const;
        deriveKeyParams.forEach(([password, iterations, salt, expected]) => {
            it(`derive key with (pw=${password}, iterations=${iterations}, salt=${salt[0]}${salt[1]}${salt[2]}…)`, async function () {
                // @ts-expect-error: Private property
                const rawKey = await keyStorage._deriveKey(password, {
                    version: Argon2Version.fromArgon2VersionByte(0x13),
                    salt,
                    memoryBytes: 1 * MiB,
                    iterations,
                    parallelism: 1,
                });
                expect(bytesToHex(rawKey.unwrap())).to.equal(expected);
            });
        });

        describe(`read encrypted key storage`, function () {
            async function readEncryptedKeyStorageAndExpectError(
                type: KeyStorageErrorType,
            ): Promise<void> {
                let thrown = false;
                try {
                    // @ts-expect-error: Private property
                    await keyStorage._readEncryptedKeyStorage();
                } catch (error) {
                    thrown = true;
                    expect(error).to.be.instanceOf(KeyStorageError);
                    assertError(error, KeyStorageError);
                    expect(error.type, error.message).to.equal(type);
                }
                if (!thrown) {
                    expect.fail(`Exception of type ${type} not thrown`);
                }
            }

            it('should throw if file not present', async function () {
                await readEncryptedKeyStorageAndExpectError('not-found');
            });

            it('should reject directory as path', async function () {
                fs.mkdirSync(keyStoragePath);
                await readEncryptedKeyStorageAndExpectError('not-readable');
            });

            it('should reject empty file', async function () {
                fs.writeFileSync(keyStoragePath, '');
                await readEncryptedKeyStorageAndExpectError('malformed');
            });

            it('should accept valid file', async function () {
                // Write actual data to file
                const encryptedKeyStorageBytes = new Uint8Array([1, 2, 3, 4]);
                const bytes = EncryptedKeyStorage.encode({
                    schemaVersion: 1,
                    encryptedKeyStorage: encryptedKeyStorageBytes,
                    kdfParameters: {
                        $case: 'argon2id',
                        argon2id: {
                            version:
                                EncryptedKeyStorage_Argon2idParameters_Argon2Version.VERSION_1_3,
                            salt: new Uint8Array(32),
                            memoryBytes: 64 * MiB,
                            iterations: ARGON2_MIN_PARAMS.accept.iterations,
                            parallelism: ARGON2_MIN_PARAMS.accept.parallelism,
                        },
                    },
                }).finish();
                fs.writeFileSync(keyStoragePath, bytes);

                // Now decoding should succeed
                const encryptedKeyStorage =
                    // @ts-expect-error: Private property
                    await keyStorage._readEncryptedKeyStorage();
                expect(encryptedKeyStorage.encryptedKeyStorage).to.byteEqual(
                    encryptedKeyStorageBytes,
                );
                expect(encryptedKeyStorage.kdfParameters?.$case).to.equal('argon2id');
                expect(encryptedKeyStorage.kdfParameters?.argon2id.memoryBytes).to.equal(64 * MiB);
            });
        });

        describe(`write encrypted key storage`, function () {
            const password = 'incred1bly s3cur3!!11';
            let argonParams: Argon2idParameters;

            this.beforeEach(function () {
                argonParams = {
                    version: Argon2Version.fromArgon2VersionByte(0x13),
                    salt: crypto.randomBytes(
                        new Uint8Array(ARGON2_MIN_PARAMS.accept.saltLengthBytes),
                    ),
                    memoryBytes: 1 * MiB,
                    iterations: ARGON2_MIN_PARAMS.accept.iterations,
                    parallelism: ARGON2_MIN_PARAMS.accept.parallelism,
                };
            });

            /**
             * Prepare an encrypted key storage.
             */
            async function makeEncryptedKeyStorage(): Promise<EncryptedKeyStorage> {
                // @ts-expect-error: Private property
                return await keyStorage._encryptKeyStorage(
                    {
                        schemaVersion: 2,
                        identityData: {
                            identity: ensureIdentityString('00000001'),
                            ck: wrapRawClientKey(crypto.randomBytes(new Uint8Array(32))),
                            serverGroup: ensureServerGroup('01'),
                        },
                        dgk: wrapRawDeviceGroupKey(crypto.randomBytes(new Uint8Array(32))),
                        databaseKey: wrapRawDatabaseKey(crypto.randomBytes(new Uint8Array(32))),
                        deviceIds: {
                            d2mDeviceId: ensureD2mDeviceId(1337n),
                            cspDeviceId: ensureCspDeviceId(7331n),
                        },
                    },
                    password,
                    argonParams,
                );
            }

            async function writeEncryptedKeyStorageAndExpectError(
                encryptedKeyStorage: EncryptedKeyStorage,
                type: KeyStorageErrorType,
            ): Promise<void> {
                let thrown = false;
                try {
                    // @ts-expect-error: Private property
                    await keyStorage._writeEncryptedKeyStorage(encryptedKeyStorage);
                } catch (error) {
                    thrown = true;
                    expect(error).to.be.instanceOf(KeyStorageError);
                    assertError(error, KeyStorageError);
                    expect(error.type, error.message).to.equal(type);
                }
                if (!thrown) {
                    expect.fail(`Exception of type ${type} not thrown`);
                }
            }

            it('should encode and encrypt key storage', async function () {
                // Prepare encrypted key storage
                const encrypted = await makeEncryptedKeyStorage();

                // Ensure that encrypted key storage matches the input parameters
                expect(encrypted.encryptedKeyStorage.byteLength).to.be.greaterThan(
                    NACL_CONSTANTS.NONCE_LENGTH + NACL_CONSTANTS.MAC_LENGTH,
                );
                expect(encrypted.kdfParameters?.$case).to.equal('argon2id');
                expect(encrypted.kdfParameters?.argon2id).not.to.be.undefined;
                const p = encrypted.kdfParameters?.argon2id;
                assert(p !== undefined);
                expect(p.version).to.equal(
                    EncryptedKeyStorage_Argon2idParameters_Argon2Version.VERSION_1_3,
                );
                expect(p.salt).to.byteEqual(argonParams.salt);
                expect(p.memoryBytes).to.equal(argonParams.memoryBytes);
                expect(p.iterations).to.equal(argonParams.iterations);
                expect(p.parallelism).to.equal(argonParams.parallelism);
            });

            it('should write key storage to file', async function () {
                // Prepare encrypted key storage
                const encrypted = await makeEncryptedKeyStorage();

                // Write to file
                expect(fs.existsSync(keyStoragePath)).to.be.false;
                // @ts-expect-error: Private property
                await keyStorage._writeEncryptedKeyStorage(encrypted);
                expect(fs.existsSync(keyStoragePath)).to.be.true;

                // Ensure that file can be read again
                const readEncryptedKeyStorage =
                    // @ts-expect-error: Private property
                    await keyStorage._readEncryptedKeyStorage();
                expect(readEncryptedKeyStorage.kdfParameters?.argon2id.salt).to.byteEqual(
                    argonParams.salt,
                );
            });

            it('should throw an appropriate error if writing fails', async function () {
                fs.mkdirSync(keyStoragePath);
                await writeEncryptedKeyStorageAndExpectError(
                    await makeEncryptedKeyStorage(),
                    'not-writable',
                );
            });
        });

        describe('decrypt key storage', function () {
            // Passwords used for encryption / decryption
            const validPassword = 'incred1bly s3cur3!!11';
            const invalidPassword = 'not-the-password';

            // Encryption params
            const argonParams: Argon2idParameters = {
                version: Argon2Version.fromArgon2VersionByte(0x13),
                salt: crypto.randomBytes(new Uint8Array(ARGON2_MIN_PARAMS.create.saltLengthBytes)),
                memoryBytes: 1 * MiB,
                iterations: ARGON2_MIN_PARAMS.accept.iterations,
                parallelism: ARGON2_MIN_PARAMS.accept.parallelism,
            };

            let keys: {
                filestoreEncryptionKey: RawKey<32>;
                ck: Uint8Array;
                dgk: Uint8Array;
                databaseKey: Uint8Array;
            };
            let validEncryptedKeyStorage: EncryptedKeyStorage;
            this.beforeAll(async function () {
                // Generate keys
                keys = {
                    // @ts-expect-error: Private property
                    filestoreEncryptionKey: await keyStorage._deriveKey(validPassword, argonParams),
                    ck: crypto.randomBytes(new Uint8Array(32)),
                    dgk: crypto.randomBytes(new Uint8Array(32)),
                    databaseKey: crypto.randomBytes(new Uint8Array(32)),
                };

                // Generate valid encrypted key storage
                validEncryptedKeyStorage = {
                    schemaVersion: 1,
                    encryptedKeyStorage: crypto
                        .getSecretBox(
                            keys.filestoreEncryptionKey.asReadonly(),
                            NONCE_UNGUARDED_SCOPE,
                            undefined,
                        )
                        .encryptor(
                            CREATE_BUFFER_TOKEN,
                            DecryptedKeyStorage.encode({
                                schemaVersion: 2,
                                identityData: {
                                    identity: '00000001',
                                    ck: keys.ck,
                                    serverGroup: ensureServerGroup('01'),
                                    deprecatedServerGroup: 0x01,
                                },
                                dgk: keys.dgk,
                                databaseKey: keys.databaseKey,
                                deviceIds: {
                                    d2mDeviceId: intoUnsignedLong(1337n),
                                    cspDeviceId: intoUnsignedLong(2448n),
                                },
                                workCredentials: undefined,
                                onPremConfig: {
                                    oppfUrl: MOCK_URL.toString(),
                                    oppfCachedConfig: '',
                                    lastUpdated: intoUnsignedLong(
                                        BigInt(new Date().getUTCMilliseconds()),
                                    ),
                                },
                            }).finish() as PlainData,
                        )
                        .encryptWithRandomNonceAhead(undefined),
                    kdfParameters: {
                        $case: 'argon2id',
                        argon2id: {
                            version: argonParams.version.toProtobuf(),
                            salt: argonParams.salt,
                            memoryBytes: argonParams.memoryBytes,
                            iterations: argonParams.iterations,
                            parallelism: argonParams.parallelism,
                        },
                    },
                };
            });

            // Helper function
            async function decryptKeyStorageAndExpectError(
                encryptedKeyStorage: EncryptedKeyStorage,
                password: string,
                type: KeyStorageErrorType,
            ): Promise<void> {
                let thrown = false;
                try {
                    // @ts-expect-error: Private property
                    await keyStorage._decryptKeyStorage(encryptedKeyStorage, password);
                } catch (error) {
                    thrown = true;
                    expect(error).to.be.instanceOf(KeyStorageError);
                    assertError(error, KeyStorageError);
                    expect(error.type, error.message).to.equal(type);
                }
                if (!thrown) {
                    expect.fail(`Exception of type ${type} not thrown`);
                }
            }

            it('should reject key storage with protobuf defaults (all zeroes)', async function () {
                await decryptKeyStorageAndExpectError(
                    EncryptedKeyStorage.decode(new Uint8Array(0)),
                    invalidPassword,
                    'invalid',
                );
            });

            it('should reject key storage with malformed protobuf bytes', async function () {
                const encryptedInvalidKeyStorageBytes = crypto
                    .getSecretBox(
                        keys.filestoreEncryptionKey.asReadonly(),
                        NONCE_UNGUARDED_SCOPE,
                        undefined,
                    )
                    .encryptor(CREATE_BUFFER_TOKEN, new Uint8Array([1, 2, 3, 4]) as PlainData)
                    .encryptWithRandomNonceAhead(undefined);
                const encryptedInvalidKeyStorage: EncryptedKeyStorage = {
                    schemaVersion: 1,
                    encryptedKeyStorage: encryptedInvalidKeyStorageBytes,
                    kdfParameters: {
                        $case: 'argon2id',
                        argon2id: {
                            version: argonParams.version.toProtobuf(),
                            salt: argonParams.salt,
                            memoryBytes: argonParams.memoryBytes,
                            iterations: argonParams.iterations,
                            parallelism: argonParams.parallelism,
                        },
                    },
                };

                // Decrypt with valid password (but the protobuf data inside is not valid)
                await decryptKeyStorageAndExpectError(
                    encryptedInvalidKeyStorage,
                    validPassword,
                    'malformed',
                );
            });

            it('should reject key storage with valid protobuf but invalid password', async function () {
                // Decrypt with invalid password
                await decryptKeyStorageAndExpectError(
                    validEncryptedKeyStorage,
                    invalidPassword,
                    'undecryptable',
                );
            });

            it('should accept valid key storage', async function () {
                // Decrypt with valid password, this should succeed
                // @ts-expect-error: Private property
                const decryptedKeyStorage = await keyStorage._decryptKeyStorage(
                    validEncryptedKeyStorage,
                    validPassword,
                );
                expect(decryptedKeyStorage.identityData?.ck).to.byteEqual(keys.ck);
                expect(decryptedKeyStorage.dgk).to.byteEqual(keys.dgk);
                expect(decryptedKeyStorage.databaseKey).to.byteEqual(keys.databaseKey);
            });
        });

        /**
         * Test successful decryption of a key storage from file system.
         */
        it(`should read valid file`, async function () {
            // Passwords used for encryption / decryption
            const password = 'incred1bly s3cur3!!11';

            // Encryption params, intentionally very low for testing
            const argonParams: Argon2idParameters = {
                version: Argon2Version.fromArgon2VersionByte(0x13),
                salt: crypto.randomBytes(new Uint8Array(ARGON2_MIN_PARAMS.accept.saltLengthBytes)),
                memoryBytes: 1 * MiB,
                iterations: ARGON2_MIN_PARAMS.accept.iterations,
                parallelism: ARGON2_MIN_PARAMS.accept.parallelism,
            };

            // Keys
            const keys = {
                // @ts-expect-error: Private property
                filestoreEncryptionKey: await keyStorage._deriveKey(password, argonParams),
                ck: crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                dgk: crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                databaseKey: crypto.randomBytes(new Uint8Array(DATABASE_KEY_LENGTH)),
            };

            // Build an EncryptedKeyStorage
            const encodedBytes = DecryptedKeyStorage.encode({
                schemaVersion: 2,
                identityData: {
                    identity: '00000001',
                    ck: keys.ck,
                    serverGroup: '01',
                    deprecatedServerGroup: 0x01,
                },
                dgk: keys.dgk,
                databaseKey: keys.databaseKey,
                deviceIds: {
                    d2mDeviceId: intoUnsignedLong(1337n),
                    cspDeviceId: intoUnsignedLong(2448n),
                },
                workCredentials: {
                    username: 'peter',
                    password: 'passwörtli',
                },
                onPremConfig: {
                    oppfUrl: MOCK_URL.toString(),
                    oppfCachedConfig: '',
                    lastUpdated: intoUnsignedLong(BigInt(new Date().getUTCMilliseconds())),
                },
            }).finish() as PlainData;
            const encryptedKeyStorageBytes = crypto
                .getSecretBox(
                    keys.filestoreEncryptionKey.asReadonly(),
                    NONCE_UNGUARDED_SCOPE,
                    undefined,
                )
                .encryptor(CREATE_BUFFER_TOKEN, encodedBytes)
                .encryptWithRandomNonceAhead(undefined);
            const encryptedKeyStorageFileBytes = EncryptedKeyStorage.encode({
                schemaVersion: 1,
                encryptedKeyStorage: encryptedKeyStorageBytes,
                kdfParameters: {
                    $case: 'argon2id',
                    argon2id: {
                        version: argonParams.version.toProtobuf(),
                        salt: argonParams.salt,
                        memoryBytes: argonParams.memoryBytes,
                        iterations: argonParams.iterations,
                        parallelism: argonParams.parallelism,
                    },
                },
            }).finish();

            // Write to file
            fs.writeFileSync(
                // @ts-expect-error: Private property
                keyStorage._keyStoragePath,
                encryptedKeyStorageFileBytes,
            );

            // Read, decode, decrypt, decode key storage
            const keyStorageContents: KeyStorageContents = await keyStorage.read(password);
            expect(keyStorageContents.identityData.ck.unwrap()).to.byteEqual(keys.ck);
            expect(keyStorageContents.dgk.unwrap()).to.byteEqual(keys.dgk);
            expect(keyStorageContents.databaseKey.unwrap()).to.byteEqual(keys.databaseKey);
            expect(keyStorageContents.deviceIds.d2mDeviceId).to.equal(1337n);
            expect(keyStorageContents.deviceIds.cspDeviceId).to.equal(2448n);
            expect(keyStorageContents.workCredentials?.username).to.equal('peter');
            expect(keyStorageContents.workCredentials?.password).to.equal('passwörtli');
        });
    });
}
