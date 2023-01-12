import {webcrypto} from 'node:crypto';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import path from 'node:path';

import {
    type FileEncryptionKey,
    type FileId,
    type FileStorage,
    type ServicesForFileStorage,
    type StoredFileHandle,
    FileStorageError,
    generateRandomFileEncryptionKey,
    randomFileId,
} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {CounterIv} from '~/common/node/file-storage/file-crypto';
import {fileModeInternalIfPosix} from '~/common/node/fs';
import {isNodeError} from '~/common/node/utils';
import {type ReadonlyUint8Array, type u53, MiB} from '~/common/types';
import {assert, debugAssert} from '~/common/utils/assert';

/**
 * System file storage format version.
 */
export const FILE_STORAGE_FORMAT = {
    /**
     * 1 MiB chunks, encrypted with AES-256-GCM, with authenticator at the end. The chunks are
     * concatenated into a single file.
     */
    V1: 1,
} as const;

export const CHUNK_SIZE_BYTES = 1 * MiB;
export const CHUNK_AUTH_TAG_BYTES = 16; // 16 bytes (128 bits) AES-GCM auth tag

/**
 * A file storage backed by the file system.
 *
 * Files are encrypted with AES-GCM (256 bit keys).
 */
export class FileSystemFileStorage implements FileStorage {
    /**
     * Create a file storage backed by the file system.
     *
     * @param _storageDirPath An existing and writable directory path the key
     *   storage should read from / write to.
     */
    public constructor(
        private readonly _services: ServicesForFileStorage,
        private readonly _log: Logger,
        private readonly _storageDirPath: string,
    ) {
        // Ensure that the storage directory exists.
        if (!fs.existsSync(this._storageDirPath)) {
            throw new FileStorageError(
                'dir-not-found',
                `File storage directory ${this._storageDirPath} does not exist`,
            );
        }
        this._log.debug(`File storage path: ${this._storageDirPath}`);
    }

    /** @inheritdoc */
    public async load(handle: StoredFileHandle): Promise<ReadonlyUint8Array> {
        const filepath = this._getFilepath(handle.fileId);

        // TODO(WEBMD-280): Compare storage format version

        let file: fsPromises.FileHandle | undefined;
        let decrypted: ReadonlyUint8Array;
        try {
            file = await fsPromises.open(filepath, 'r');
            decrypted = await this._readAndDecrypt(
                file,
                handle.encryptionKey,
                handle.unencryptedByteCount,
            );
        } catch (error) {
            // If file was not found: Return a 'not-found' error
            if (isNodeError(error)) {
                if (error.code === 'ENOENT') {
                    throw new FileStorageError(
                        'not-found',
                        `File with ID ${handle.fileId} not found`,
                        {from: error},
                    );
                }
            }

            // Other errors: Wrap and re-throw
            throw new FileStorageError(
                'read-error',
                `Could not load file with ID ${handle.fileId}`,
                {
                    from: error,
                },
            );
        } finally {
            file?.close().catch((e) => this._log.warn(`Failed to close file: ${e}`));
        }

        this._log.debug(`Loaded file with ID ${handle.fileId} (${decrypted.byteLength} bytes)`);

        return decrypted;
    }

    /** @inheritdoc */
    public async store(data: ReadonlyUint8Array): Promise<StoredFileHandle> {
        const fileId = randomFileId(this._services.crypto);
        const filepath = this._getFilepath(fileId);

        // Generate random file encryption key
        const key = generateRandomFileEncryptionKey(this._services.crypto);

        // Open file for appending
        let file: fsPromises.FileHandle | undefined;
        try {
            // Note: Opening the file in `wx` mode will fail if the file already exists.
            file = await fsPromises.open(filepath, 'wx', fileModeInternalIfPosix());
        } catch (error) {
            // Close file
            file?.close().catch((e) => this._log.warn(`Failed to close file: ${e}`));

            let message = `Could not write file with ID ${fileId}`;
            if (isNodeError(error)) {
                if (error.code === 'EEXIST') {
                    message += ': File already exists';
                } else {
                    message += ` (${error.code})`;
                }
            }
            throw new FileStorageError('write-error', message, {from: error});
        }

        // Encrypt data and write it to the specified file
        await this._encryptAndWrite(data, key, file);

        // Flush and close file descriptor
        await file.close();

        this._log.debug(`Stored file with ID ${fileId} (${data.byteLength} bytes)`);
        return {
            fileId,
            encryptionKey: key,
            unencryptedByteCount: data.byteLength,
            storageFormatVersion: FILE_STORAGE_FORMAT.V1,
        };
    }

    /** @inheritdoc */
    public async delete(fileId: FileId): Promise<boolean> {
        const filepath = this._getFilepath(fileId);
        try {
            await fsPromises.unlink(filepath);
        } catch (error) {
            let message = `Could not delete file with ID ${fileId}`;
            if (isNodeError(error)) {
                if (error.code === 'ENOENT') {
                    // File does not exist
                    return false;
                }
                message += ` (${error.code})`;
            }
            throw new FileStorageError('delete-error', message, {from: error});
        }
        this._log.debug(`Deleted file with ID ${fileId}`);
        return true;
    }

    /**
     * Return the file path to the given file ID.
     */
    private _getFilepath(id: FileId): string {
        return path.join(this._storageDirPath, id);
    }

    /**
     * Encrypt the `data` with the `key` and append it to the specified file handle.
     */
    private async _encryptAndWrite(
        data: ReadonlyUint8Array,
        key: FileEncryptionKey,
        file: fsPromises.FileHandle,
    ): Promise<void> {
        // Load encryption key and IV for AES-GCM
        const aesKey = await webcrypto.subtle.importKey(
            'raw',
            key.unwrap(),
            {name: 'AES-GCM'},
            false,
            ['encrypt'],
        );
        const iv = new CounterIv();

        // Encrypt and write file in chunks
        for (let i = 0; i < data.byteLength; i += CHUNK_SIZE_BYTES) {
            const chunk = data.subarray(i, i + CHUNK_SIZE_BYTES);
            const encryptedChunk = await webcrypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    additionalData: undefined,
                    iv: iv.next(),
                    tagLength: CHUNK_AUTH_TAG_BYTES * 8,
                },
                aesKey,
                chunk,
            );
            await file.appendFile(new Uint8Array(encryptedChunk));
        }
    }

    /**
     * Read the `file` chunkwise, decrypt each chunk and return a promise with the decrypted bytes.
     *
     * TODO(WEBMD-909): Return a ReadableStream?
     */
    private async _readAndDecrypt(
        file: fsPromises.FileHandle,
        key: FileEncryptionKey,
        unencryptedByteCount: u53,
    ): Promise<ReadonlyUint8Array> {
        // Determine chunk count
        const chunkSizeWithOverhead = CHUNK_SIZE_BYTES + CHUNK_AUTH_TAG_BYTES;
        const chunkCount = Math.ceil(unencryptedByteCount / CHUNK_SIZE_BYTES);

        // Load decryption key and IV for AES-GCM
        const aesKey = await webcrypto.subtle.importKey(
            'raw',
            key.unwrap(),
            {name: 'AES-GCM'},
            false,
            ['decrypt'],
        );
        const iv = new CounterIv();

        // Buffer for decrypted bytes
        const decrypted = new Uint8Array(unencryptedByteCount);

        // Read file in chunks and decrypt each chunk
        let remainingBytes = unencryptedByteCount + chunkCount * CHUNK_AUTH_TAG_BYTES;
        const chunkBuf = new Uint8Array(chunkSizeWithOverhead);
        for (let i = 0; i < chunkCount; i++) {
            // Read chunk
            const chunkBytes = Math.min(chunkSizeWithOverhead, remainingBytes);
            const {bytesRead} = await file.read({buffer: chunkBuf, length: chunkSizeWithOverhead});
            assert(
                bytesRead === chunkBytes,
                `Expected to read ${chunkBytes}, but read ${bytesRead}`,
            );
            remainingBytes -= bytesRead;

            // Decrypt
            const decryptedChunk = await webcrypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    additionalData: undefined,
                    iv: iv.next(),
                    tagLength: CHUNK_AUTH_TAG_BYTES * 8,
                },
                aesKey,
                chunkBuf.subarray(0, bytesRead),
            );
            debugAssert(
                decryptedChunk.byteLength === chunkBytes - CHUNK_AUTH_TAG_BYTES,
                `Expected ${chunkBytes - CHUNK_AUTH_TAG_BYTES} decrypted bytes, but found ${
                    decryptedChunk.byteLength
                }`,
            );

            // Write to output buffer
            decrypted.set(new Uint8Array(decryptedChunk), i * CHUNK_SIZE_BYTES);
        }

        // Ensure that file is now empty
        const result = await file.read({length: 1});
        assert(result.bytesRead === 0, `Expected file to be empty after reading, but it isn't`);

        return decrypted;
    }
}
