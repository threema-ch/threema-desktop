import {
    type EncryptedData,
    NACL_CONSTANTS,
    type Nonce,
    NONCE_UNGUARDED_TOKEN,
    type PlainData,
} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {TransferTag} from '~/common/enum';
import {BaseError, type BaseErrorOptions, extractErrorMessage} from '~/common/error';
import {type Logger} from '~/common/logging';
import {type ServicesForTasks} from '~/common/network/protocol/task';
import {type RawBlobKey, wrapRawBlobKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array, type WeakOpaque} from '~/common/types';
import {ensureError} from '~/common/utils/assert';
import {registerErrorTransferHandler, TRANSFER_MARKER} from '~/common/utils/endpoint';

/**
 * Byte length of a Threema Blob ID.
 */
export const BLOB_ID_LENGTH = 16;

/**
 * A blob ID (16 bytes).
 */
export type BlobId = WeakOpaque<ReadonlyUint8Array, {readonly BlobId: unique symbol}>;

/**
 * Type guard for {@link BlobId}.
 */
export function isBlobId(id: unknown): id is BlobId {
    return id instanceof Uint8Array && id.byteLength === BLOB_ID_LENGTH;
}

/**
 * Ensure input is a valid {@link BlobId}.
 */
export function ensureBlobId(id: Uint8Array): BlobId {
    if (!isBlobId(id)) {
        throw new Error(
            `Expected Blob ID to be ${BLOB_ID_LENGTH} bytes but has ${id.byteLength} bytes`,
        );
    }
    return id;
}

/**
 * The scope of a Blob API call.
 *
 * When uploading:
 *
 * - `local`: The blob will only be available on the local blob mirror and will be removed from the
 *   blob mirror once all devices have marked the blob as 'done'.
 * - `public`: Like `local` but the blob will also be available on the public blob server for
 *    everyone. It will be removed from the public blob server once **anyone** has marked it as
 *    'done' there.
 *
 * When downloading:
 *
 * - `local`: The blob will only be looked up on the local blob mirror. If the blob isn't found
 *   there, a "not found" response will be returned.
 * - `public`: In this case, the blob will first be looked up on the local blob mirror, followed by
 *   the public blob server.
 *
 * When marking a blob as 'done':
 *
 * - `local`: Once all devices marked the blob as 'done', it will be removed from the blob mirror.
 * - `public`: Like `local` but the blob will also be removed on the public blob server.
 *
 * In practice, this means that...
 *
 * ...when uploading:
 *
 * - When uploading a blob for reflection, use `local`.
 * - When uploading a blob for an outgoing CSP message, use `public`.
 *
 * ...when downloading:
 *
 * - When downloading a blob for an incoming message from another Threema user, always use `public`
 *   for the download.
 * - When downloading a blob for a reflected message that is only relevant inside the device group
 *   (e.g. when syncing the user's own profile picture), use `local` for the download.
 *
 * ...when marking a download as done:
 *
 * - When a blob as part of a reflected message has been downloaded, use `local` to mark it as
 *   'done'.
 * - When downloading a blob for an incoming CSP message as part of a 1:1 conversation, use `public`
 *   to mark it as 'done'.
 * - When downloading a blob for an incoming CSP message as part of a group conversation, use
 *   `local` to mark it as 'done' on the blob mirror in order to prevent removing it on the public
 *   blob server for other group participants.
 */
export type BlobScope = 'local' | 'public';

/**
 * Downloaded blob result.
 */
export interface BlobDownloadResult {
    /**
     * The blob's data.
     */
    readonly data: EncryptedData;

    /**
     * Mark a blob as 'done' (i.e. eligible for removal once all devices have downloaded the blob).
     *
     * This should be called as soon as possible once the blob's data has been stored and is
     * idempotent, i.e. may be called multiple times.
     *
     * @throws {BlobBackendError} if marking blob as done fails.
     */
    readonly done: (scope: BlobScope) => Promise<void>;
}

/**
 * Blob API backend.
 */
export interface BlobBackend {
    /**
     * Upload a blob.
     *
     * @throws {BlobBackendError} if uploading the blob fails.
     */
    upload: (scope: BlobScope, data: EncryptedData) => Promise<BlobId>;

    /**
     * Download a blob.
     *
     * @throws {BlobBackendError} if downloading the blob fails.
     */
    download: (scope: BlobScope, id: BlobId) => Promise<BlobDownloadResult>;
}

/**
 * Type of the {@link BlobBackendError}.
 *
 * - fetch: An error occurred when downloading data from or uploading data to the server.
 * - not-found: The blob mirror returned 404 for this blob.
 * - invalid-blob-id: Blob ID returned on upload is invalid.
 */
export type BlobBackendErrorType = 'fetch' | 'not-found' | 'invalid-blob-id';

const BLOB_BACKEND_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    BlobBackendError,
    TransferTag.BLOB_BACKEND_ERROR,
    [type: BlobBackendErrorType]
>({
    tag: TransferTag.BLOB_BACKEND_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new BlobBackendError(type, message, {from: cause}),
});

/**
 * Errors related to working with the blob mirror.
 */
export class BlobBackendError extends BaseError {
    public [TRANSFER_MARKER] = BLOB_BACKEND_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: BlobBackendErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/**
 * Download the blob, decrypt its bytes and mark it as downloaded.
 *
 * @throws {BlobBackendError} if downloading the blob fails.
 * @throws {CryptoError} if decryption fails.
 */
export async function downloadAndDecryptBlob(
    services: Pick<ServicesForTasks, 'blob' | 'crypto'>,
    log: Logger,
    id: BlobId,
    key: RawBlobKey,
    nonce: Nonce,
    downloadScope: BlobScope,
    doneScope: BlobScope,
): Promise<ReadonlyUint8Array> {
    const {blob, crypto} = services;

    // Download
    const result = await blob.download(downloadScope, id);

    // Decrypt blob bytes
    const box = crypto.getSecretBox(key, NONCE_UNGUARDED_TOKEN);
    const decrypted = box.decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, result.data).decrypt();

    // Mark as downloaded in the background
    // TODO(DESK-921): Do this *after* processing!
    result
        .done(doneScope)
        .catch((error) =>
            log.warn(
                `Failed to mark blob as done: ${extractErrorMessage(ensureError(error), 'short')}`,
            ),
        );

    // Return decrypted bytes
    return decrypted;
}

/**
 * Encrypt the blob with a random key and upload the encrypted bytes.
 *
 * @throws {BlobBackendError} if uploading the blob fails.
 * @throws {CryptoError} if encryption fails.
 */
export async function encryptAndUploadBlob(
    services: Pick<ServicesForTasks, 'blob' | 'crypto'>,
    bytes: ReadonlyUint8Array,
    nonce: Nonce,
    uploadScope: BlobScope,
): Promise<{id: BlobId; key: RawBlobKey; nonce: Nonce}> {
    const {blob, crypto} = services;

    // Encrypt blob bytes
    const randomKey = wrapRawBlobKey(crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)));
    const box = crypto.getSecretBox(randomKey, NONCE_UNGUARDED_TOKEN);
    const encryptedBytes = box
        .encryptor(CREATE_BUFFER_TOKEN, bytes as PlainData)
        .encryptWithNonce(nonce);

    // Upload encrypted data
    const blobId = await blob.upload(uploadScope, encryptedBytes);

    // Return blob info
    return {
        id: blobId,
        key: randomKey,
        nonce,
    };
}
