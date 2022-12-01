import {randomBytes} from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {expect} from 'chai';

import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {
    type FileStorage,
    type FileStorageErrorType,
    byteToFileId,
    ensureFileId,
    FILE_ID_LENGTH_HEX_CHARS,
    FileStorageError,
    InMemoryFileStorage,
    randomFileId,
} from '~/common/file-storage';
import {NOOP_LOGGER} from '~/common/logging';
import {FileSystemFileStorage} from '~/common/node/file-storage/system-file-storage';
import {isNodeError} from '~/common/node/utils';
import {assertError} from '~/common/utils/assert';
import {byteView} from '~/common/utils/byte';

/**
 * File storage tests.
 */
export function run(): void {
    describe('FileStorage', function () {
        // Crypto backend
        const crypto = new TweetNaClBackend((buffer) => {
            const array = byteView(Uint8Array, buffer);
            array.set(randomBytes(array.byteLength));
            return buffer;
        });

        /**
         * Helper function for asserting information about an exception.
         *
         * @param errorOrPromise The error to be analyzed, or a promise to be run.
         * @param expectedErrorType The expected {@link FileStorageErrorType}.
         * @param messageSubstring Optional: A string that should be present inside the message.
         * @param causeCode Optional: The I/O error code attached to the error cause.
         * @param causeMessageSubstring Optional: A string that should be present inside the error cause message.
         */
        async function assertFileStorageError(
            errorOrPromise: unknown,
            expectedErrorType: FileStorageErrorType,
            messageSubstring?: string,
            causeCode?: string,
            causeMessageSubstring?: string,
        ): Promise<void> {
            // Handle `errorOrPromise`. If it's a promise, await it first, and catch the exception.
            let error;
            if (errorOrPromise instanceof Promise) {
                let thrown = false;
                try {
                    await errorOrPromise;
                } catch (caughtError) {
                    thrown = true;
                    error = caughtError;
                }
                expect(thrown, 'Exception should have been thrown').to.be.true;
            } else {
                error = errorOrPromise;
            }

            // Now we're dealing with an error.
            expect(error).to.be.instanceOf(FileStorageError);
            assertError(error, FileStorageError);
            expect(error.type, error.message).to.equal(expectedErrorType);

            // Optional assertions
            if (messageSubstring !== undefined) {
                expect(error.message).to.include(messageSubstring);
            }
            if (causeCode !== undefined || causeMessageSubstring !== undefined) {
                if (isNodeError(error.cause)) {
                    expect(error.cause.code).to.equal(causeCode);
                    expect(error.cause.message).to.include(causeMessageSubstring);
                } else {
                    expect.fail('Wrong type of error cause, expected a NodeJS error');
                }
            }
        }

        describe('randomFileId', function () {
            it('generates valid File IDs', function () {
                const fileIds = new Set();
                for (let i = 0; i < 10; i++) {
                    const fileId = randomFileId(crypto);
                    fileIds.add(fileId);
                    expect(fileId.length, 'Generated File ID has the wrong length').to.equal(
                        FILE_ID_LENGTH_HEX_CHARS,
                    );
                }
                // Ensure that the File IDs are not all the same
                expect(
                    fileIds.size,
                    'Ten calls to randomFileId did not result in ten different File IDs!',
                ).to.equal(10);
            });

            it('can convert valid bytes to File IDs', function () {
                expect(
                    byteToFileId(
                        new Uint8Array([
                            1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8,
                        ]),
                    ),
                ).to.equal('010203040506070801020304050607080102030405060708');
            });

            it('will not convert invalid bytes to File IDs', function () {
                expect(() =>
                    byteToFileId(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5])),
                ).to.throw('Expected 24 bytes, but got 13 bytes');
            });
        });

        function genericStorageTests(makeStorage: () => FileStorage): void {
            it('returns an appropriate error for unknown files', async function () {
                const storage = makeStorage();
                const fileId = ensureFileId('00112233445566778899aabbccddeeff0011223344556677');
                await assertFileStorageError(
                    storage.load(fileId),
                    'not-found',
                    'File with ID 00112233445566778899aabbccddeeff0011223344556677 not found',
                );
            });

            it('can load stored files', async function () {
                const storage = makeStorage();
                const fileId = await storage.store(Uint8Array.of(1, 2, 3, 4));
                const readBytes = await storage.load(fileId);
                expect(readBytes, 'readBytes').not.to.be.undefined;
                expect(readBytes).to.byteEqual(Uint8Array.of(1, 2, 3, 4));
            });
        }

        describe('InMemoryFileStorage', function () {
            // Run generic tests
            genericStorageTests(() => new InMemoryFileStorage(crypto));
        });

        describe('FileSystemFileStorage', function () {
            let appPath: string;
            let storageDirPath: string;
            let fileStorage: FileStorage;

            this.beforeEach(function () {
                appPath = fs.mkdtempSync(path.join(os.tmpdir(), 'threema-desktop-test-'));
                storageDirPath = path.join(appPath, 'files');
                fs.mkdirSync(storageDirPath);
                fileStorage = new FileSystemFileStorage({crypto}, NOOP_LOGGER, storageDirPath);
            });

            this.afterEach(function () {
                fs.rmSync(appPath, {recursive: true});
            });

            // Run generic tests
            genericStorageTests(() => fileStorage);

            it('propagates the I/O error if the storage directory cannot be written', async function () {
                fs.rmSync(storageDirPath, {recursive: true});
                await assertFileStorageError(
                    fileStorage.store(Uint8Array.of(1, 2, 3, 4)),
                    'write-error',
                    undefined,
                    'ENOENT',
                    'no such file or directory',
                );
            });

            it('will error if file already exists', async function () {
                // To test this, we'll use a RNG that always returns the same bytes.
                // This way, a File ID will always consist of 24 0-bytes.
                const nonRandomCrypto = new TweetNaClBackend((buffer) => buffer);
                const nonRandomFileStorage = new FileSystemFileStorage(
                    {crypto: nonRandomCrypto},
                    NOOP_LOGGER,
                    storageDirPath,
                );

                // First, file does not exist
                const zeroFileId = '000000000000000000000000000000000000000000000000';
                expect(
                    fs.existsSync(path.join(storageDirPath, zeroFileId)),
                    'All-zero file should not yet exist',
                ).to.be.false;

                // Write file
                await nonRandomFileStorage.store(Uint8Array.of(1, 2, 3, 4));

                // Now the file should exist
                expect(
                    fs.existsSync(path.join(storageDirPath, zeroFileId)),
                    'All-zero file should exist',
                ).to.be.true;

                // If we try to write again, that should fail.
                await assertFileStorageError(
                    nonRandomFileStorage.store(Uint8Array.of(1, 2, 3, 4)),
                    'write-error',
                    'File already exists',
                );
            });

            it('ensure proper file mode', async function () {
                const fileId = await fileStorage.store(Uint8Array.of(1, 2, 3, 4));
                const stat = fs.statSync(path.join(storageDirPath, fileId));
                // eslint-disable-next-line no-bitwise
                const fileMode = `0${(stat.mode & 0o777).toString(8)}`;
                expect(fileMode).to.equal('0600');
            });

            it('is backed by a cache', async function () {
                const data = Uint8Array.of(1, 2, 3, 4);
                const fileId = await fileStorage.store(data);

                // Load should return the value from the cache
                const data2 = await fileStorage.load(fileId);

                // Compare references, should point to the same instance
                expect(data2).to.equal(data);

                // Sanity check
                const data3 = Uint8Array.of(1, 2, 3, 4);
                expect(data2).not.to.equal(data3);
            });
        });
    });
}
