import {webcrypto} from 'node:crypto';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import path from 'node:path';

import {
    type FileEncryptionKey,
    type FileId,
    type FileStorage,
    FileStorageError,
    randomFileEncryptionKey,
    randomFileId,
    type ServicesForFileStorage,
    type StoredFileHandle,
} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import {FileChunkNonce} from '~/common/node/file-storage/file-crypto';
import {directoryModeInternalObjectIfPosix, fileModeInternalIfPosix} from '~/common/node/fs';
import {isNodeError} from '~/common/node/utils';
import {MiB, type ReadonlyUint8Array, type u53} from '~/common/types';
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
 * An encrypted file storage backed by the file system. File contents are encrypted with
 * AES-GCM-256.
 *
 * The construction used for encrypting files on the file system is an instance of an online
 * authenticated encryption scheme called STREAM (as described in HRRV15¹). AES-GCM is used as the
 * underlying AEAD scheme with 256-bit keys, 128-bit authentication tags, and 96-bit nonces, which
 * consist of 32 bits random values and 32 bits of counter followed by an 8-bit encoding of either 0
 * or 1. Furthermore, the file is encrypted in segments of size 1 MiB, to reduce the memory
 * consumption when encrypting or decrypting large files.
 *
 * This scheme provides security in sense of nOAE (cf. Section 7 of HRRV15¹). Nonces should never be
 * reused under the same key. For more details on the nonce construction, see the documentation
 * comment for {@link FileChunkNonce}.
 *
 * ¹ HRRV15: "Online authenticated-encryption and its nonce-reuse misuse-resistance" by Hoang,
 *   Reyhanitabar, Rogaway and Vizár, https://eprint.iacr.org/2015/189
 */
export class FileSystemFileStorage implements FileStorage {
    public readonly currentStorageFormatVersion = FILE_STORAGE_FORMAT.V1;

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
        const filepath = await this._getFilepath(handle.fileId);

        // Ensure that the storage format version is supported
        if (handle.storageFormatVersion !== FILE_STORAGE_FORMAT.V1) {
            throw new FileStorageError(
                'unsupported-format',
                `Unsupported storage format version (${handle.storageFormatVersion})`,
            );
        }

        let file: fsPromises.FileHandle | undefined;
        let decrypted: ReadonlyUint8Array;
        try {
            file = await fsPromises.open(filepath, 'r');
            decrypted = await this._readAndDecrypt(
                handle.fileId,
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
                `Could not load file with ID ${handle.fileId}: ${error}`,
                {
                    from: error,
                },
            );
        } finally {
            file
                ?.close()
                .catch((error: unknown) => this._log.warn(`Failed to close file: ${error}`));
        }

        this._log.debug(`Loaded file with ID ${handle.fileId} (${decrypted.byteLength} bytes)`);

        return decrypted;
    }

    /** @inheritdoc */
    public async store(data: ReadonlyUint8Array): Promise<StoredFileHandle> {
        // Determine file path
        const fileId = randomFileId(this._services.crypto);
        let filepath;
        try {
            filepath = await this._getFilepath(fileId, {create: true});
        } catch (error) {
            throw new FileStorageError('write-error', `Could not create file directory`, {
                from: error,
            });
        }

        // Generate random file encryption key
        const key = randomFileEncryptionKey(this._services.crypto);

        // Open file for appending
        let file: fsPromises.FileHandle | undefined;
        try {
            // Note: Opening the file in `wx` mode will fail if the file already exists.
            file = await fsPromises.open(filepath, 'wx', fileModeInternalIfPosix());
        } catch (openError) {
            // Close file
            file
                ?.close()
                .catch((closeError: unknown) =>
                    this._log.warn(`Failed to close file: ${closeError}`),
                );

            let message = `Could not write file with ID ${fileId}`;
            if (isNodeError(openError)) {
                if (openError.code === 'EEXIST') {
                    message += ': File already exists';
                } else {
                    message += ` (${openError.code})`;
                }
            }
            throw new FileStorageError('write-error', message, {from: openError});
        }

        // Encrypt data and write it to the specified file
        await this._encryptAndWrite(fileId, data, key, file);

        // Flush and close file descriptor
        await file.close();

        this._log.debug(`Stored file with ID ${fileId} (${data.byteLength} bytes)`);
        return {
            fileId,
            encryptionKey: key,
            unencryptedByteCount: data.byteLength,
            storageFormatVersion: this.currentStorageFormatVersion,
        };
    }

    /** @inheritdoc */
    public async delete(fileId: FileId): Promise<boolean> {
        const filepath = await this._getFilepath(fileId);
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
     *
     * If `options.create` is `true`, then the parent directory will be created if it doesn't yet
     * exist.
     *
     * Note: Each file is stored in a subdirectory corresponding to the first byte (first two hex
     * characters) of the {@link FileId}.
     */
    private async _getFilepath(id: FileId, options?: {create?: boolean}): Promise<string> {
        const prefix = id.substring(0, 2);
        const filepath = path.join(this._storageDirPath, prefix, id);

        if (options?.create ?? false) {
            const dir = path.dirname(filepath);
            this._log.debug(`Creating directory ${dir}`);
            await fsPromises.mkdir(dir, {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
        }

        return filepath;
    }

    /**
     * Encrypt the `data` with the `key` and append it to the specified file handle.
     */
    private async _encryptAndWrite(
        id: FileId,
        data: ReadonlyUint8Array,
        key: FileEncryptionKey,
        file: fsPromises.FileHandle,
    ): Promise<void> {
        // Load encryption key and IV/nonce for AES-GCM
        const aesKey = await webcrypto.subtle.importKey(
            'raw',
            key.unwrap(),
            {name: 'AES-GCM'},
            false,
            ['encrypt'],
        );
        const nonce = new FileChunkNonce(id);

        // Encrypt and write file in chunks
        for (let offset = 0; offset < data.byteLength; offset += CHUNK_SIZE_BYTES) {
            const chunk = data.subarray(offset, offset + CHUNK_SIZE_BYTES);
            const isLastChunk = offset + CHUNK_SIZE_BYTES >= data.byteLength;
            const encryptedChunk = await webcrypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    additionalData: undefined,
                    iv: nonce.next(isLastChunk),
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
     * TODO(DESK-909): Return a ReadableStream?
     */
    private async _readAndDecrypt(
        id: FileId,
        file: fsPromises.FileHandle,
        key: FileEncryptionKey,
        unencryptedByteCount: u53,
    ): Promise<ReadonlyUint8Array> {
        // Determine chunk count
        const chunkSizeWithOverhead = CHUNK_SIZE_BYTES + CHUNK_AUTH_TAG_BYTES;
        const chunkCount = Math.ceil(unencryptedByteCount / CHUNK_SIZE_BYTES);

        // Load decryption key and IV/nonce for AES-GCM
        const aesKey = await webcrypto.subtle.importKey(
            'raw',
            key.unwrap(),
            {name: 'AES-GCM'},
            false,
            ['decrypt'],
        );
        const nonce = new FileChunkNonce(id);

        // Buffer for decrypted bytes
        const decrypted = new Uint8Array(unencryptedByteCount);

        // Read file in chunks and decrypt each chunk
        let remainingBytes = unencryptedByteCount + chunkCount * CHUNK_AUTH_TAG_BYTES;
        const chunkBuf = new Uint8Array(chunkSizeWithOverhead);
        for (let i = 0; i < chunkCount; i++) {
            const isLastChunk = i === chunkCount - 1;

            // Read chunk
            const chunkBytes = Math.min(chunkSizeWithOverhead, remainingBytes);
            const {bytesRead} = await file.read({buffer: chunkBuf, length: chunkSizeWithOverhead});
            assert(
                bytesRead === chunkBytes,
                `Expected to read ${chunkBytes}, but read ${bytesRead}`,
            );
            remainingBytes -= bytesRead;
            assert(
                !isLastChunk || remainingBytes === 0,
                `Expected remainingBytes after last chunk to be 0, but was ${remainingBytes}`,
            );

            // Decrypt
            const decryptedChunk = await webcrypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    additionalData: undefined,
                    iv: nonce.next(isLastChunk),
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
