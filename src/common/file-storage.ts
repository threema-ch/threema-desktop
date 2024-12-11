/**
 * Common types related to generic blob storage.
 */

import type {ServicesForBackend} from '~/common/backend';
import {type CryptoBackend, type ReadonlyRawKey, wrapRawKey} from '~/common/crypto';
import type {adapter} from '~/common/dom/streams';
import {TransferTag} from '~/common/enum';
import {BaseError, type BaseErrorOptions, extractErrorMessage} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {ReadonlyUint8Array, u53, WeakOpaque} from '~/common/types';
import {ensureError} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {registerErrorTransferHandler} from '~/common/utils/endpoint';

/**
 * A 24-byte File ID in lowercase hexadecimal string format.
 *
 * Note: The format of the FileID is validated using {@link FILE_ID_RE}.
 */
export type FileId = WeakOpaque<string, {readonly FileId: unique symbol}>;

export const COPYABLE_FILE_STORAGE = Symbol('copyable-file-storage');

/**
 * Interface implemented by File Storages that have a copying functionality, allowing copying files
 * from one FileStorage to another.
 */
export interface CopyableFileStorage extends FileStorage {
    readonly storageType: typeof COPYABLE_FILE_STORAGE;

    /**
     * Get the raw file system path of a {@link fileId}.
     */
    readonly getRawPath: (fileId: FileId) => Promise<string>;
    /**
     * Copy a file from an arbitrary source path into the file storage.
     *
     * Note: The path should point to a file that is compatible with the current file storage (e.g.
     * in terms of encryption).
     */
    readonly copyFromRawPath: (fileId: FileId, sourcePath: string) => Promise<boolean>;
}

/**
 * Interface implemented by File Storages that are temporary.
 */
export interface TempFileStorage {
    /**
     * Open a write stream to write a file at the given path. Note: The returned
     * {@link fs.WriteStream} is auto-closing.
     *
     * Warning: This function is only in charge of *creating* a {@link WritableStream}, and will
     * successfully return one even if the file already exists (but an error will be thrown if the
     * stream is written to)! Make sure to handle stream write errors correctly when you use it.
     *
     * @param relativePath The path relative to the temp file storage directory, including the file
     *   name and extension, to store the file at. Might be an array of partial paths that will be
     *   joined.
     * @throws `FileStorageError` if the write stream cannot be created.
     */
    readonly createWritableStream: (
        relativePath: string | string[],
    ) => Promise<adapter.WritableStreamLike<Uint8Array>>;
    /**
     * Clear all items currently stored in the temp directory or inside subdirectory.
     *
     * @throws `FileStorageError` if something went wrong during deletion.
     */
    readonly clear: (subdir?: string) => Promise<void>;
}

/**
 * File encryption key (32 bytes).
 *
 * Must be different for every file, and must be used for encrypting only one file.
 */
export type FileEncryptionKey = WeakOpaque<
    ReadonlyRawKey<32>,
    {readonly FileEncryptionKey: unique symbol}
>;

/**
 * Use 256-bit key for AES.
 */
export const FILE_ENCRYPTION_KEY_LENGTH = 32;

/**
 * Wrap a key into a {@link FileEncryptionKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapFileEncryptionKey(key: Uint8Array): FileEncryptionKey {
    return wrapRawKey(key, FILE_ENCRYPTION_KEY_LENGTH).asReadonly() as FileEncryptionKey;
}

/**
 * Generate a random {@link FileEncryptionKey} using 32 cryptographically secure random bytes
 */
export function randomFileEncryptionKey(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
): FileEncryptionKey {
    const keyBytes = crypto.randomBytes(new Uint8Array(FILE_ENCRYPTION_KEY_LENGTH));
    return wrapFileEncryptionKey(keyBytes);
}

/**
 * Services required by the file storage factory.
 */
export type ServicesForFileStorageFactory = Pick<ServicesForBackend, 'config' | 'crypto'>;

/**
 * Services required by the file storage.
 */
export type ServicesForFileStorage = Pick<ServicesForBackend, 'crypto'>;

/**
 * Byte length of a File ID.
 */
export const FILE_ID_LENGTH_BYTES = 24;

/**
 * Hex-encoded character length of a File ID.
 */
export const FILE_ID_LENGTH_HEX_CHARS = 2 * FILE_ID_LENGTH_BYTES;

/**
 * Regular expression for {@link FileId}.
 */
const FILE_ID_RE = /^[0-9a-f]*$/u;

/**
 * Validate a value. If it is a string consisting of 48 hexadecimal characters
 * (0-f), accept it as a {@link FileId}.
 */
export function isFileId(id: unknown): id is FileId {
    return typeof id === 'string' && id.length === FILE_ID_LENGTH_HEX_CHARS && FILE_ID_RE.test(id);
}

/**
 * Ensure input is a valid {@link FileId}.
 *
 * @throws {Error} If `val` is not a valid {@link FileId}.
 */
export function ensureFileId(id: string): FileId {
    if (!isFileId(id)) {
        throw new Error(
            `Expected File ID to be a ${FILE_ID_LENGTH_HEX_CHARS}-character lowercase hex string`,
        );
    }
    return id;
}

/**
 * Create and return a new random {@link FileId} using 24 cryptographically secure random bytes.
 *
 * @param crypto A {@link CryptoBackend} implementation.
 */
export function randomFileId(crypto: Pick<CryptoBackend, 'randomBytes'>): FileId {
    const bytes = crypto.randomBytes(new Uint8Array(FILE_ID_LENGTH_BYTES));
    return bytesToHex(bytes) as FileId;
}

/**
 * Convert a {@link FILE_ID_LENGTH_BYTES}-byte array to a {@link FileId}.
 *
 * @throws {Error} If the array length is not {@link FILE_ID_LENGTH_BYTES}.
 */
export function byteToFileId(array: ReadonlyUint8Array): FileId {
    if (array.byteLength !== FILE_ID_LENGTH_BYTES) {
        throw new Error(
            `Expected ${FILE_ID_LENGTH_BYTES} bytes, but got ${array.byteLength} bytes`,
        );
    }
    return bytesToHex(array) as FileId;
}

/**
 * Delete files with the specified file IDs in a background task.
 *
 * The result will not be awaited! If deletion fails, an error is logged.
 */
export function deleteFilesInBackground(file: FileStorage, log: Logger, fileIds: FileId[]): void {
    for (const fileId of fileIds) {
        file.delete(fileId).catch((error_: unknown) => {
            const error = ensureError(error_);
            log.error(`Error while deleting file: ${extractErrorMessage(error, 'short')}`);
        });
    }
}

/**
 * Typeguard to check if a file storage has the ability to copy files to another file storage.
 *
 * TODO(DESK-1480) Pass the class directly for type safety instead of working with the abstracted
 * interface.
 */
export function canCopyFiles(storage: FileStorage): storage is CopyableFileStorage {
    return storage.storageType === COPYABLE_FILE_STORAGE;
}

/**
 * Copy files with the specified file IDs from {@link oldFileStorage} to {@link newFileStorage}.
 */
export async function copyFiles(
    oldFileStorage: CopyableFileStorage,
    newFileStorage: CopyableFileStorage,
    log: Logger,
    fileIds: FileId[],
): Promise<void> {
    const promises = [];
    for (const fileId of fileIds) {
        const sourcePath = await oldFileStorage.getRawPath(fileId);
        log.info(`Restoring file ${sourcePath}`);
        promises.push(
            newFileStorage.copyFromRawPath(fileId, sourcePath).catch((error_: unknown) => {
                const error = ensureError(error_);
                log.error(`Error while copying file: ${extractErrorMessage(error, 'short')}`);
            }),
        );
    }
    await Promise.all(promises);
}

export interface StoredFileHandle {
    /**
     * The assigned file ID.
     */
    readonly fileId: FileId;
    /**
     * The encryption key used to encrypt the file.
     */
    readonly encryptionKey: FileEncryptionKey;
    /**
     * Unencrypted file size in bytes.
     */
    readonly unencryptedByteCount: u53;
    /**
     * The file storage format version. The storage backend can use this to implement compatibility
     * checks.
     */
    readonly storageFormatVersion: u53;
}

/**
 * Generic interface for a file storage.
 *
 * Note: This interface assumes immutable files. In other words: A file with a specific `FileId` is
 *       only written once, and never modified. Thanks to this property, some read/write race
 *       conditions can be avoided, and it makes all files easily cacheable. To ensure that this
 *       invariant is upheld, the `store` method always generates a new random `FileId` and does not
 *       allow overwriting an existing `FileId`.
 */
export interface FileStorage {
    /**
     * Storage type. Subtypes can override this.
     */
    readonly storageType?: unknown;

    /**
     * The current / latest storage format version.
     */
    readonly currentStorageFormatVersion: u53;

    /**
     * Load a file from the storage, decrypt it and return the decrypted bytes.
     *
     * @throws {FileStorageError} In case the file cannot be found or read (e.g. due to a permission
     *   problem).
     * @throws {FileStorageError} In case the file storage format version is not supported.
     */
    readonly load: (handle: StoredFileHandle) => Promise<ReadonlyUint8Array>;

    /**
     * Encrypt and store the provided bytes in the file storage and return the assigned
     * {@link StoredFileHandle}.
     *
     * @param data Bytes to be stored. Note that these bytes must not be altered by the caller after
     *   calling this function!
     * @throws {FileStorageError} if file cannot be stored or already exists.
     */
    readonly store: (data: ReadonlyUint8Array) => Promise<StoredFileHandle>;

    /**
     * Delete the file with the specified {@link FileId}.
     *
     * @returns true if a file was deleted. false if no file was present.
     * @throws {FileStorageError} if something went wrong during deletion.
     */
    readonly delete: (fileId: FileId) => Promise<boolean>;
}

/**
 * Type of the {@link FileStorageError}.
 *
 * - not-found: The requested file was not found in the file storage.
 * - dir-not-found: File storage directory could not be found.
 * - read-error: File could not be read from the storage.
 * - write-error: File could not be written to the storage.
 * - delete-error: File could not be deleted from the storage.
 */
export type FileStorageErrorType =
    | 'not-found'
    | 'dir-not-found'
    | 'read-error'
    | 'write-error'
    | 'delete-error'
    | 'copy-error'
    | 'unsupported-format';

const FILE_STORAGE_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    FileStorageError,
    TransferTag.FILE_STORAGE_ERROR,
    [type: FileStorageErrorType]
>({
    tag: TransferTag.FILE_STORAGE_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new FileStorageError(type, message, {from: cause}),
});

/**
 * Errors related to a {@link FileStorage}.
 */
export class FileStorageError extends BaseError {
    public [TRANSFER_HANDLER] = FILE_STORAGE_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: FileStorageErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/**
 * A simple in-memory file storage backed by a {@link Map}.
 *
 * Since this is in-memory only and not used in the Electron app, no encryption takes place.
 */
export class InMemoryFileStorage implements FileStorage {
    // The in-memory storage is not persistent, thus we can hardcode the storage format version to 0
    public readonly currentStorageFormatVersion = 0;

    private readonly _files = new Map<FileId, ReadonlyUint8Array>();

    public constructor(private readonly _crypto: Pick<CryptoBackend, 'randomBytes'>) {}

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async load(handle: StoredFileHandle): Promise<ReadonlyUint8Array> {
        if (handle.storageFormatVersion !== this.currentStorageFormatVersion) {
            throw new FileStorageError(
                'unsupported-format',
                `Unsupported storage format version (${handle.storageFormatVersion})`,
            );
        }
        const bytes = this._files.get(handle.fileId);
        if (bytes === undefined) {
            throw new FileStorageError('not-found', `File with ID ${handle.fileId} not found`);
        }
        return bytes;
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async store(data: ReadonlyUint8Array): Promise<StoredFileHandle> {
        const fileId = randomFileId(this._crypto);
        this._files.set(fileId, data);

        // We don't encrypt in the in-memory storage, but need to generate a random file encryption
        // key to satisfy the return type.
        const key = randomFileEncryptionKey(this._crypto);

        return {
            fileId,
            encryptionKey: key,
            unencryptedByteCount: data.byteLength,
            storageFormatVersion: this.currentStorageFormatVersion,
        };
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async delete(fileId: FileId): Promise<boolean> {
        return this._files.delete(fileId);
    }
}
