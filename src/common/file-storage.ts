/**
 * Common types related to generic blob storage.
 */

import {type ServicesForBackend} from '~/common/backend';
import {type CryptoBackend, type RawKey, wrapRawKey} from '~/common/crypto';
import {TransferTag} from '~/common/enum';
import {type BaseErrorOptions, BaseError} from '~/common/error';
import {type ReadonlyUint8Array, type u53, type WeakOpaque} from '~/common/types';
import {bytesToHex} from '~/common/utils/byte';
import {registerErrorTransferHandler, TRANSFER_MARKER} from '~/common/utils/endpoint';

/**
 * A 24-byte File ID in lowercase hexadecimal string format.
 */
export type FileId = WeakOpaque<string, {readonly FileId: unique symbol}>;

/**
 * File encryption key (32 bytes).
 *
 * Must be different for every file, and must be used for encrypting only one file.
 */
export type FileEncryptionKey = WeakOpaque<RawKey<32>, {readonly FileEncryptionKey: unique symbol}>;

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
    return wrapRawKey(key, FILE_ENCRYPTION_KEY_LENGTH) as FileEncryptionKey;
}

/**
 * Generate a random {@link FileEncryptionKey}.
 */
export function generateRandomFileEncryptionKey(crypto: CryptoBackend): FileEncryptionKey {
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
 * Create and return a new random {@link FileId}.
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
     * Load a file from the storage, decrypt it and return the decrypted bytes.
     *
     * @throws {FileStorageError} In case the file cannot be found or read (e.g.
     *   due to a permission problem).
     */
    load: (handle: StoredFileHandle) => Promise<ReadonlyUint8Array>;

    /**
     * Encrypt and store the provided bytes in the file storage and return the assigned
     * {@link StoredFileHandle}.
     *
     * @param data Bytes to be stored. Note that these bytes must not be altered by the caller after
     *   calling this function!
     * @throws {FileStorageError} if file cannot be stored or already exists.
     */
    store: (data: ReadonlyUint8Array) => Promise<StoredFileHandle>;
}

/**
 * Type of the {@link FileStorageError}.
 *
 * - not-found: The requested file was not found in the file storage.
 * - dir-not-found: File storage directory could not be found.
 * - read-error: File could not be read from the storage.
 * - write-rror: File cound not be writtten to the storage.
 */
export type FileStorageErrorType = 'not-found' | 'dir-not-found' | 'read-error' | 'write-error';

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
    public [TRANSFER_MARKER] = FILE_STORAGE_ERROR_TRANSFER_HANDLER;

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
 */
export class InMemoryFileStorage implements FileStorage {
    private readonly _files: Map<FileId, ReadonlyUint8Array> = new Map();

    public constructor(private readonly _crypto: Pick<CryptoBackend, 'randomBytes'>) {}

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async load(handle: StoredFileHandle): Promise<ReadonlyUint8Array> {
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

        // In-memory database does not encrypt! Thus, we can use an all-0 key.
        const key = wrapFileEncryptionKey(new Uint8Array(FILE_ENCRYPTION_KEY_LENGTH));

        // The in-memory storage is not persistent, thus we can hardcode the storage format version to 0
        const storageFormatVersion = 0;

        return {fileId, encryptionKey: key, storageFormatVersion};
    }
}
