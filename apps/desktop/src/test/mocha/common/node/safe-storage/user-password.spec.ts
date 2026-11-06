import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {expect} from 'chai';

import {NOOP_LOGGER} from '~/common/logging';
import {
    isSecureStorageAvailable,
    loadUserPassword,
    storeUserPassword,
    type UserPasswordContext,
    type UserPasswordSafeStorage,
} from '~/common/node/safe-storage/user-password';

interface FakeSafeStorageOptions {
    available?: boolean;
    backend?: string;
    /**
     * Ciphertext prefix produced by `encryptStringAsync`.
     */
    encryptPrefix?: string;
    shouldReEncrypt?: boolean;
    failEncrypt?: boolean;
    failDecrypt?: boolean;
}

type FakeSafeStorage = UserPasswordSafeStorage & {
    readonly calls: {encrypt: number; decrypt: number};
};

/**
 * Fake `safeStorage`: "Encrypts" by prepending a 3 byte version prefix to the plain text.
 */
function makeFakeSafeStorage(options: FakeSafeStorageOptions = {}): FakeSafeStorage {
    const calls = {encrypt: 0, decrypt: 0};
    return {
        calls,
        isAsyncEncryptionAvailable: async () => await Promise.resolve(options.available ?? true),
        getSelectedStorageBackend: () => options.backend ?? 'gnome_libsecret',
        encryptStringAsync: async (plainText) => {
            calls.encrypt++;
            if (options.failEncrypt === true) {
                throw new Error('encrypt failed');
            }
            return await Promise.resolve(
                Buffer.concat([
                    Buffer.from(options.encryptPrefix ?? 'v12', 'latin1'),
                    Buffer.from(plainText, 'utf8'),
                ]),
            );
        },
        decryptStringAsync: async (encrypted) => {
            calls.decrypt++;
            if (options.failDecrypt === true) {
                throw new Error('decrypt failed');
            }
            return await Promise.resolve({
                shouldReEncrypt: options.shouldReEncrypt ?? false,
                result: encrypted.subarray(3).toString('utf8'),
            });
        },
    };
}

function ciphertext(prefix: string, password: string): Buffer {
    return Buffer.concat([Buffer.from(prefix, 'latin1'), Buffer.from(password, 'utf8')]);
}

export function run(): void {
    describe('safe-storage user password', function () {
        let directory: string;
        let passwordFilePath: string;

        function makeContext(
            safeStorage: UserPasswordSafeStorage,
            platform: NodeJS.Platform = 'linux',
        ): UserPasswordContext {
            return {safeStorage, platform, passwordFilePath, log: NOOP_LOGGER};
        }

        function readPasswordFile(): string {
            return fs.readFileSync(passwordFilePath).toString('latin1');
        }

        function expectNoTemporaryFile(): void {
            expect(fs.existsSync(`${passwordFilePath}.tmp`)).to.be.false;
        }

        this.beforeEach(function () {
            directory = fs.mkdtempSync(path.join(os.tmpdir(), 'threema-desktop-test-'));
            passwordFilePath = path.join(directory, 'password');
        });

        this.afterEach(function () {
            fs.rmSync(directory, {recursive: true, force: true});
        });

        describe('isSecureStorageAvailable', function () {
            it('is true if async encryption is available', async function () {
                const safeStorage = makeFakeSafeStorage();
                expect(await isSecureStorageAvailable(makeContext(safeStorage))).to.be.true;
            });

            it('is false if async encryption is not available', async function () {
                const safeStorage = makeFakeSafeStorage({available: false});
                expect(await isSecureStorageAvailable(makeContext(safeStorage))).to.be.false;
            });

            it('is false if availability check rejects', async function () {
                const safeStorage: UserPasswordSafeStorage = {
                    ...makeFakeSafeStorage(),
                    isAsyncEncryptionAvailable: async () =>
                        await Promise.reject(new Error('init failed')),
                };
                expect(await isSecureStorageAvailable(makeContext(safeStorage))).to.be.false;
            });

            it('is false on Linux with the unknown backend', async function () {
                const safeStorage = makeFakeSafeStorage({backend: 'unknown'});
                expect(await isSecureStorageAvailable(makeContext(safeStorage, 'linux'))).to.be
                    .false;
                expect(safeStorage.calls.encrypt).to.equal(0);
            });

            it('is true on Linux with the basic_text backend if the probe uses the Secret portal', async function () {
                // Flatpak sandbox without access to the host keyring, but with a Secret portal
                const safeStorage = makeFakeSafeStorage({
                    backend: 'basic_text',
                    encryptPrefix: 'v12',
                });
                expect(await isSecureStorageAvailable(makeContext(safeStorage, 'linux'))).to.be
                    .true;
            });

            it('is false on Linux with the basic_text backend if the probe uses the insecure fallback', async function () {
                const safeStorage = makeFakeSafeStorage({
                    backend: 'basic_text',
                    encryptPrefix: 'v10',
                });
                expect(await isSecureStorageAvailable(makeContext(safeStorage, 'linux'))).to.be
                    .false;
            });

            it('ignores the backend on other platforms', async function () {
                const safeStorage = makeFakeSafeStorage({backend: 'basic_text'});
                expect(await isSecureStorageAvailable(makeContext(safeStorage, 'darwin'))).to.be
                    .true;
            });

            it('is false on Linux if the probe uses the insecure fallback', async function () {
                // The backend claims a secret service, but the fallback key is used
                const safeStorage = makeFakeSafeStorage({
                    backend: 'gnome_libsecret',
                    encryptPrefix: 'v10',
                });
                expect(await isSecureStorageAvailable(makeContext(safeStorage, 'linux'))).to.be
                    .false;
                expect(safeStorage.calls.encrypt).to.equal(1);
            });

            for (const prefix of ['v11', 'v12']) {
                it(`is true on Linux if the probe uses prefix ${prefix}`, async function () {
                    const safeStorage = makeFakeSafeStorage({encryptPrefix: prefix});
                    expect(await isSecureStorageAvailable(makeContext(safeStorage, 'linux'))).to.be
                        .true;
                });
            }

            it('is false on Linux if the probe fails, and retries', async function () {
                const safeStorage = makeFakeSafeStorage({failEncrypt: true});
                const context = makeContext(safeStorage, 'linux');
                expect(await isSecureStorageAvailable(context)).to.be.false;
                expect(await isSecureStorageAvailable(context)).to.be.false;
                expect(safeStorage.calls.encrypt).to.equal(2);
            });

            it('caches the probe result', async function () {
                const safeStorage = makeFakeSafeStorage({encryptPrefix: 'v12'});
                const context = makeContext(safeStorage, 'linux');
                expect(await isSecureStorageAvailable(context)).to.be.true;
                expect(await isSecureStorageAvailable(context)).to.be.true;
                expect(safeStorage.calls.encrypt).to.equal(1);
            });

            it('does not probe on other platforms', async function () {
                const safeStorage = makeFakeSafeStorage({encryptPrefix: 'v10'});
                expect(await isSecureStorageAvailable(makeContext(safeStorage, 'darwin'))).to.be
                    .true;
                expect(safeStorage.calls.encrypt).to.equal(0);
            });
        });

        describe('loadUserPassword', function () {
            it('returns undefined if the password file does not exist', async function () {
                const safeStorage = makeFakeSafeStorage();
                expect(await loadUserPassword(makeContext(safeStorage))).to.be.undefined;
                expect(safeStorage.calls.decrypt).to.equal(0);
            });

            it('returns undefined if async encryption is not available', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'secret'));
                const safeStorage = makeFakeSafeStorage({available: false});
                expect(await loadUserPassword(makeContext(safeStorage))).to.be.undefined;
                expect(safeStorage.calls.decrypt).to.equal(0);
                expect(fs.existsSync(passwordFilePath)).to.be.true;
            });

            it('returns the password without re-encrypting', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v12', 'secret'));
                const safeStorage = makeFakeSafeStorage();
                expect(await loadUserPassword(makeContext(safeStorage))).to.equal('secret');
                expect(safeStorage.calls.decrypt).to.equal(1);
                expect(safeStorage.calls.encrypt).to.equal(0);
                expect(readPasswordFile()).to.equal('v12secret');
            });

            it('decrypts exactly once and re-encrypts once if requested', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'secret'));
                const safeStorage = makeFakeSafeStorage({
                    shouldReEncrypt: true,
                    encryptPrefix: 'v12',
                });
                expect(await loadUserPassword(makeContext(safeStorage))).to.equal('secret');
                expect(safeStorage.calls.decrypt).to.equal(1);
                expect(safeStorage.calls.encrypt).to.equal(1);
                expect(readPasswordFile()).to.equal('v12secret');
                expectNoTemporaryFile();
            });

            it('returns the password if re-encryption fails', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'secret'));
                const safeStorage = makeFakeSafeStorage({
                    shouldReEncrypt: true,
                    failEncrypt: true,
                });
                expect(await loadUserPassword(makeContext(safeStorage))).to.equal('secret');
                expect(readPasswordFile()).to.equal('v11secret');
                expectNoTemporaryFile();
            });

            it('does not re-encrypt with the insecure fallback on Linux', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'secret'));
                const safeStorage = makeFakeSafeStorage({
                    shouldReEncrypt: true,
                    encryptPrefix: 'v10',
                });
                expect(await loadUserPassword(makeContext(safeStorage, 'linux'))).to.equal(
                    'secret',
                );
                expect(readPasswordFile()).to.equal('v11secret');
                expectNoTemporaryFile();
            });

            it('still loads a password file encrypted with the insecure fallback', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v10', 'secret'));
                const safeStorage = makeFakeSafeStorage({backend: 'basic_text'});
                expect(await loadUserPassword(makeContext(safeStorage, 'linux'))).to.equal(
                    'secret',
                );
                expect(readPasswordFile()).to.equal('v10secret');
            });

            it('returns undefined and keeps the file if decryption fails', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'secret'));
                const safeStorage = makeFakeSafeStorage({failDecrypt: true});
                expect(await loadUserPassword(makeContext(safeStorage))).to.be.undefined;
                expect(safeStorage.calls.encrypt).to.equal(0);
                expect(readPasswordFile()).to.equal('v11secret');
            });

            it('returns undefined and keeps the file if reading fails', async function () {
                // A directory exists, but cannot be read as a file
                fs.mkdirSync(passwordFilePath);
                const safeStorage = makeFakeSafeStorage();
                expect(await loadUserPassword(makeContext(safeStorage))).to.be.undefined;
                expect(safeStorage.calls.decrypt).to.equal(0);
                expect(fs.existsSync(passwordFilePath)).to.be.true;
            });
        });

        describe('storeUserPassword', function () {
            it('encrypts and writes the password file', async function () {
                const safeStorage = makeFakeSafeStorage();
                expect(await storeUserPassword(makeContext(safeStorage), 'secret')).to.be.true;
                expect(readPasswordFile()).to.equal('v12secret');
                expectNoTemporaryFile();
            });

            it('replaces an existing password file', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'old'));
                const safeStorage = makeFakeSafeStorage();
                expect(await storeUserPassword(makeContext(safeStorage), 'new')).to.be.true;
                expect(readPasswordFile()).to.equal('v12new');
                expectNoTemporaryFile();
            });

            it('does not store if async encryption is not available', async function () {
                const safeStorage = makeFakeSafeStorage({available: false});
                expect(await storeUserPassword(makeContext(safeStorage), 'secret')).to.be.false;
                expect(safeStorage.calls.encrypt).to.equal(0);
                expect(fs.existsSync(passwordFilePath)).to.be.false;
            });

            it('stores on Linux with the basic_text backend via the Secret portal', async function () {
                const safeStorage = makeFakeSafeStorage({
                    backend: 'basic_text',
                    encryptPrefix: 'v12',
                });
                expect(await storeUserPassword(makeContext(safeStorage, 'linux'), 'secret')).to.be
                    .true;
                expect(readPasswordFile()).to.equal('v12secret');
            });

            it('does not store on Linux with the basic_text backend and the insecure fallback', async function () {
                const safeStorage = makeFakeSafeStorage({
                    backend: 'basic_text',
                    encryptPrefix: 'v10',
                });
                expect(await storeUserPassword(makeContext(safeStorage, 'linux'), 'secret')).to.be
                    .false;
                expect(fs.existsSync(passwordFilePath)).to.be.false;
            });

            it('does not store insecure fallback ciphertext on Linux', async function () {
                fs.writeFileSync(passwordFilePath, ciphertext('v11', 'old'));
                const safeStorage = makeFakeSafeStorage({encryptPrefix: 'v10'});
                expect(await storeUserPassword(makeContext(safeStorage, 'linux'), 'new')).to.be
                    .false;
                // Refused by the probe, the password itself is never encrypted
                expect(safeStorage.calls.encrypt).to.equal(1);
                expect(readPasswordFile()).to.equal('v11old');
                expectNoTemporaryFile();
            });

            it('stores v10 ciphertext on macOS (regular prefix there)', async function () {
                const safeStorage = makeFakeSafeStorage({encryptPrefix: 'v10'});
                expect(await storeUserPassword(makeContext(safeStorage, 'darwin'), 'secret')).to.be
                    .true;
                expect(readPasswordFile()).to.equal('v10secret');
            });

            it('returns false if encryption fails', async function () {
                const safeStorage = makeFakeSafeStorage({failEncrypt: true});
                expect(await storeUserPassword(makeContext(safeStorage), 'secret')).to.be.false;
                expect(fs.existsSync(passwordFilePath)).to.be.false;
                expectNoTemporaryFile();
            });

            it('removes the temporary file if the rename fails', async function () {
                // A non-empty directory at the target path makes the rename fail
                fs.mkdirSync(passwordFilePath);
                fs.writeFileSync(path.join(passwordFilePath, 'blocker'), 'x');
                const safeStorage = makeFakeSafeStorage();
                expect(await storeUserPassword(makeContext(safeStorage), 'secret')).to.be.false;
                expectNoTemporaryFile();
            });
        });
    });
}
