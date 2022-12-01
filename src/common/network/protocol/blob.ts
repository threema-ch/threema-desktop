import {TransferTag} from '~/common/enum';
import {type BaseErrorOptions, BaseError} from '~/common/error';
import {type ReadonlyUint8Array, type WeakOpaque} from '~/common/types';
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
 * Data of a blob.
 */
export type BlobBytes = WeakOpaque<ReadonlyUint8Array, {readonly BlobBytes: unique symbol}>;

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
    readonly data: ReadonlyUint8Array;

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
    upload: (scope: BlobScope, data: ReadonlyUint8Array) => Promise<BlobId>;

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
 * - fetch: An error occurred when fetching data from the server.
 * - invalid: Retrieved data is invalid.
 */
export type BlobBackendErrorType = 'fetch' | 'invalid';

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
