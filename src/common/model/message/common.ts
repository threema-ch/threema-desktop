import {type Nonce, NONCE_UNGUARDED_SCOPE} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import type {DbBaseFileMessageFragment, DbConversationUid, DbMessageUid} from '~/common/db';
import {
    BlobDownloadState,
    MessageDirection,
    MessageDirectionUtils,
    type MessageType,
    ReceiverType,
} from '~/common/enum';
import {BlobFetchError} from '~/common/error';
import {deleteFilesInBackground, FileStorageError} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import type {ServicesForModel} from '~/common/model/types/common';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyFileBasedMessageModelLifetimeGuard,
    AnyFileBasedOutboundMessageModelLifetimeGuard,
    AnyNonDeletedMessageType,
    CommonBaseFileMessageView,
    CommonBaseMessageView,
    FileData,
    FileMessageDataState,
    OutboundBaseFileMessageView,
    UpdateFileBasedMessage,
} from '~/common/model/types/message';
import type {
    InboundImageMessageController,
    OutboundImageMessageController,
} from '~/common/model/types/message/image';
import type {InboundVideoMessageController} from '~/common/model/types/message/video';
import {
    BlobBackendError,
    type BlobScope,
    encryptAndUploadBlobWithEncryptionKey,
    type BlobId,
} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE, BLOB_THUMBNAIL_NONCE} from '~/common/network/protocol/constants';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {Mutable, ReadonlyUint8Array, StrictExtract} from '~/common/types';
import {assert, ensureError, unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import type {AsyncLock} from '~/common/utils/lock';
import {hasProperty} from '~/common/utils/object';

export const NO_SENDER = Symbol('no-sender');

/**
 * Get the download state (of the file blob) for the specified inbound or outbound file message.
 */
export function getFileMessageDataState(
    message: Pick<DbBaseFileMessageFragment, 'blobId' | 'fileData' | 'blobDownloadState'>,
): FileMessageDataState {
    // If both file data and blob ID are set, message is fully synced
    if (message.fileData !== undefined && message.blobId !== undefined) {
        return 'synced';
    }

    // If neither file data nor blob ID are set, or if the download state is marked as failed,
    // message download is failed and cannot be reattempted
    if (message.fileData === undefined && message.blobId === undefined) {
        return 'failed';
    }
    if (message.blobDownloadState === BlobDownloadState.PERMANENT_FAILURE) {
        return 'failed';
    }

    // Otherwise the message is unsynced
    return 'unsynced';
}

export type BlobType = 'main' | 'thumbnail';

/**
 * Determine the scope for downloading blobs.
 */
function determineBlobDownloadScope(messageDirection: MessageDirection): BlobScope {
    switch (messageDirection) {
        case MessageDirection.INBOUND:
            return 'public';
        case MessageDirection.OUTBOUND:
            return 'local';
        default:
            return unreachable(messageDirection);
    }
}

/**
 * Determine the scope for marking blobs as done.
 */
function determineBlobDoneScope(
    messageDirection: MessageDirection,
    receiverType: ReceiverType,
): BlobScope {
    // Outbound messages are only marked as done with "local" scope, to prevent deleting the blob
    // from the public blob server before the recipient has downloaded it.
    if (messageDirection === MessageDirection.OUTBOUND) {
        return 'local';
    }

    // For inbound messages, it depends on the receiver type
    switch (receiverType) {
        case ReceiverType.CONTACT:
        case ReceiverType.DISTRIBUTION_LIST:
            // For contacts and distribution lists, use public scope, so that the blobs are removed
            // from the public blob server.
            return 'public';
        case ReceiverType.GROUP:
            // For groups, use local scope, so that the blobs are retained for the other group
            // members when marking blob as done.
            return 'local';
        default:
            return unreachable(receiverType);
    }
}

/**
 * Update the download state of a file-based message.
 */
export function updateFileBasedMessage(
    services: Pick<ServicesForModel, 'db' | 'file'>,
    log: Logger,
    messageType: AnyNonDeletedMessageType,
    conversationUid: DbConversationUid,
    messageUid: DbMessageUid,
    change: UpdateFileBasedMessage,
): void {
    const {db, file} = services;
    const {deletedFileIds} = db.updateMessage(conversationUid, {
        ...change,
        type: messageType,
        uid: messageUid,
    });
    deleteFilesInBackground(file, log, deletedFileIds);
}

export interface BlobLoadResult {
    /**
     * Blob bytes along with the media type.
     */
    readonly data: FileBytesAndMediaType;
    /**
     * Blob source:
     *
     * - filesystem: Loaded from the encrypted file system.
     * - network: Downloaded from the blob server.
     */
    readonly source: 'filesystem' | 'network';
}

export async function loadOrDownloadBlob(
    type: 'main',
    messageType: AnyNonDeletedMessageType,
    messageDirection: MessageDirection,
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    lifetimeGuard: AnyFileBasedMessageModelLifetimeGuard,
    log: Logger,
): Promise<BlobLoadResult>;
export async function loadOrDownloadBlob(
    type: 'thumbnail',
    messageType: AnyNonDeletedMessageType,
    messageDirection: MessageDirection,
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    lifetimeGuard: AnyFileBasedMessageModelLifetimeGuard,
    log: Logger,
): Promise<BlobLoadResult | undefined>;
/**
 * Load blob of the specified type.
 *
 * If the blob has not yet been downloaded, the download will be started and the database will be
 * updated. Once that is done, the promise will resolve with the blob data.
 *
 * On error, the promise will reject with a {@link BlobFetchError}.
 */
export async function loadOrDownloadBlob(
    type: BlobType,
    messageType: AnyNonDeletedMessageType,
    messageDirection: MessageDirection,
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    lifetimeGuard: AnyFileBasedMessageModelLifetimeGuard,
    log: Logger,
): Promise<BlobLoadResult | undefined> {
    const {blob, crypto, file} = services;

    /**
     * Properties of all file-based message views that are specific to file-based messages.
     */
    type BaseFileMessageViewFragment = Omit<CommonBaseFileMessageView, keyof CommonBaseMessageView>;

    /**
     * Mark the download of the file or thumbnail as permanently failed.
     *
     * If it's a file download, update the state in the view to 'failed' as well.
     */
    function markDownloadAsPermanentlyFailed(): void {
        let dbChange: Partial<BaseFileMessageViewFragment>;
        let viewChange: Partial<BaseFileMessageViewFragment>;
        switch (type) {
            case 'main':
                dbChange = {blobDownloadState: BlobDownloadState.PERMANENT_FAILURE};
                viewChange = {...dbChange, state: 'failed'};
                break;
            case 'thumbnail':
                dbChange = {thumbnailBlobDownloadState: BlobDownloadState.PERMANENT_FAILURE};
                viewChange = {...dbChange};
                break;
            default:
                unreachable(type);
        }
        lifetimeGuard.update(() => {
            updateFileBasedMessage(
                services,
                log,
                messageType,
                conversation.uid,
                messageUid,
                dbChange,
            );
            return viewChange;
        });
    }

    // Because the download logic is async and consists of multiple steps, we need a lock to
    // avoid races where the same blob is downloaded multiple times.
    return await lock.with(async (): Promise<BlobLoadResult | undefined> => {
        // Load blob data from file system.
        //
        // Note: Either both the file data and media type are defined simultaneously, or both will
        // return as `undefined`.
        const [existingFileData, existingMediaType]:
            | [existingFileData: FileData, existingMediaType: string]
            | [existingFileData: undefined, existingMediaType: undefined] = lifetimeGuard.run(
            (handle) => {
                switch (type) {
                    case 'main': {
                        const fileData = handle.view().fileData;
                        if (fileData !== undefined) {
                            return [fileData, handle.view().mediaType];
                        }
                        break;
                    }
                    case 'thumbnail': {
                        const thumbnailFileData = handle.view().thumbnailFileData;
                        const thumbnailMediaType = handle.view().thumbnailMediaType;
                        if (thumbnailFileData !== undefined) {
                            assert(
                                thumbnailMediaType !== undefined,
                                'Thumbnail media type should always be defined if medium has thumbnail bytes',
                            );

                            return [thumbnailFileData, thumbnailMediaType];
                        }
                        break;
                    }
                    default:
                        return unreachable(type);
                }

                return [undefined, undefined];
            },
        );

        // If blob is already downloaded (i.e. a fileId is set), return it directly.
        if (existingFileData !== undefined) {
            try {
                return {
                    data: {
                        bytes: await file.load(existingFileData),
                        mediaType: existingMediaType,
                    },
                    source: 'filesystem',
                };
            } catch (error) {
                const message = `Could not fetch bytes from file system: ${error}`;
                if (error instanceof FileStorageError) {
                    throw new BlobFetchError(
                        {kind: 'file-storage-error', cause: error.type},
                        message,
                    );
                }
                throw new BlobFetchError({kind: 'file-storage-error'}, message);
            }
        }

        // If blob is marked as permanently failed, don't attempt to download
        const downloadState = lifetimeGuard.run((handle) => {
            switch (type) {
                case 'main':
                    return handle.view().blobDownloadState;
                case 'thumbnail':
                    return handle.view().thumbnailBlobDownloadState;
                default:
                    return unreachable(type);
            }
        });
        if (downloadState === BlobDownloadState.PERMANENT_FAILURE) {
            switch (type) {
                case 'main':
                    throw new BlobFetchError(
                        {kind: 'permanent-download-error'},
                        'Blob download is marked as permanently failed',
                    );
                case 'thumbnail':
                    return undefined;
                default:
                    return unreachable(type);
            }
        }

        // Get matching blob ID, mediaType, and nonce
        const [blobId, mediaType, nonce]:
            | [blobId: BlobId, mediaType: string, nonce: Nonce]
            | [blobId: undefined, mediaType: undefined, nonce: undefined] = lifetimeGuard.run(
            (handle) => {
                switch (type) {
                    case 'main': {
                        const mainBlobId = handle.view().blobId;
                        const mainMediaType = handle.view().mediaType;

                        if (mainBlobId !== undefined) {
                            return [mainBlobId, mainMediaType, BLOB_FILE_NONCE];
                        }
                        break;
                    }
                    case 'thumbnail': {
                        const thumbnailBlobId = handle.view().thumbnailBlobId;
                        const thumbnailMediaType = handle.view().thumbnailMediaType;

                        if (thumbnailBlobId !== undefined && thumbnailMediaType !== undefined) {
                            return [thumbnailBlobId, thumbnailMediaType, BLOB_THUMBNAIL_NONCE];
                        }
                        break;
                    }
                    default:
                        return unreachable(type);
                }

                return [undefined, undefined, undefined];
            },
        );

        // If there is no blob ID and no file data, there's nothing to be downloaded
        if (blobId === undefined) {
            switch (type) {
                case 'main':
                    markDownloadAsPermanentlyFailed();
                    throw new BlobFetchError(
                        {kind: 'internal'},
                        'Both file data and blob ID are missing',
                    );
                case 'thumbnail':
                    // No thumbnail available
                    return undefined;
                default:
                    return unreachable(type);
            }
        }

        // Otherwise, download blob from the blob mirror
        const blobDownloadScope = determineBlobDownloadScope(messageDirection);
        log.debug(
            `Downloading ${type} blob for ${MessageDirectionUtils.nameOf(
                messageDirection,
            )} message (scope=${blobDownloadScope})`,
        );
        if (type === 'main') {
            lifetimeGuard.update((view) => ({state: 'syncing'}));
        }
        let downloadResult;
        try {
            downloadResult = await blob.download(blobDownloadScope, blobId);
        } catch (error) {
            if (error instanceof BlobBackendError && error.type === 'not-found') {
                // Permanent failure, blob not found
                markDownloadAsPermanentlyFailed();
                throw new BlobFetchError(
                    {kind: 'permanent-download-error', cause: error},
                    'Blob was not found on the server and was marked as permanently failed',
                );
            } else if (type === 'main') {
                // Temporary failure. If this is about the file (and not the thumbnail), revert the
                // state to "unsynced".
                lifetimeGuard.update((view) => ({state: 'unsynced'}));
            }
            throw new BlobFetchError(
                {kind: 'temporary-download-error', cause: ensureError(error)},
                'Temporary blob download error',
            );
        }

        // Decrypt bytes
        const secretBox = crypto.getSecretBox(
            lifetimeGuard.run((handle) => handle.view().encryptionKey),
            NONCE_UNGUARDED_SCOPE,
            undefined,
        );
        let decryptedBytes;
        try {
            decryptedBytes = secretBox
                .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, downloadResult.data)
                .decrypt(undefined).plainData;
        } catch (error) {
            throw new BlobFetchError(
                {kind: 'decryption-error', cause: ensureError(error)},
                'Decrypting blob bytes failed',
            );
        }

        // Blob downloaded, store in file storage
        let storedFile;
        try {
            storedFile = await file.store(decryptedBytes);
        } catch (error) {
            const message = `Could not write bytes to file system: ${error}`;
            if (error instanceof FileStorageError) {
                throw new BlobFetchError({kind: 'file-storage-error', cause: error.type}, message);
            }
            throw new BlobFetchError({kind: 'file-storage-error'}, message);
        }
        const storedFileData = {
            fileId: storedFile.fileId,
            encryptionKey: storedFile.encryptionKey,
            unencryptedByteCount: decryptedBytes.byteLength,
            storageFormatVersion: storedFile.storageFormatVersion,
        };

        // Update database
        let dbChange: Partial<BaseFileMessageViewFragment>;
        let viewChange: Partial<BaseFileMessageViewFragment>;
        switch (type) {
            case 'main':
                dbChange = {fileData: storedFileData};
                viewChange = {...dbChange, state: 'synced'};
                break;
            case 'thumbnail':
                dbChange = {thumbnailFileData: storedFileData};
                viewChange = {...dbChange};
                break;
            default:
                unreachable(type);
        }
        lifetimeGuard.update(() => {
            updateFileBasedMessage(
                services,
                log,
                messageType,
                conversation.uid,
                messageUid,
                dbChange,
            );
            return viewChange;
        });

        // Mark as downloaded
        //
        // Note: This is done in the background, we don't await the result of the done call.
        const blobDoneScope = determineBlobDoneScope(
            messageDirection,
            conversation.receiverLookup.type,
        );
        log.debug(
            `Marking ${type} blob for ${MessageDirectionUtils.nameOf(
                messageDirection,
            )} message as downloaded (scope=${blobDoneScope})`,
        );
        downloadResult.done(blobDoneScope).catch((error: unknown) => {
            log.error(`Failed to mark blob with id ${bytesToHex(blobId)} as done`, error);
        });
        log.info(`Downloaded ${type} blob`);

        // Return data
        return {
            data: {
                bytes: decryptedBytes,
                mediaType,
            },
            source: 'network',
        };
    });
}

/**
 * Upload the {@link FileData} of the specified {@link BlobType} and return blob bytes and ID.
 */
async function uploadFileAsBlob(
    type: BlobType,
    data: FileData,
    nonce: Nonce,
    key: RawBlobKey,
    services: Pick<ServicesForModel, 'blob' | 'crypto' | 'file'>,
): Promise<{bytes: ReadonlyUint8Array} & ({blobId: BlobId} | {thumbnailBlobId: BlobId})> {
    const bytes = await services.file.load(data);
    const {id} = await encryptAndUploadBlobWithEncryptionKey(services, bytes, nonce, key, 'public');
    switch (type) {
        case 'main':
            return {bytes, blobId: id};
        case 'thumbnail':
            return {bytes, thumbnailBlobId: id};
        default:
            return unreachable(type);
    }
}

export type UploadedBlobBytes = {readonly [k in BlobType]: ReadonlyUint8Array | undefined};

/**
 * Upload all message blobs that haven't yet been uploaded, and store the resulting blob IDs in the
 * message model.
 *
 * The uploaded file and thumbnail bytes are returned for further processing.
 */
export async function uploadBlobs(
    messageType: AnyNonDeletedMessageType,
    messageUid: DbMessageUid,
    conversationUid: DbConversationUid,
    services: Pick<ServicesForModel, 'blob' | 'crypto' | 'db' | 'file'>,
    lifetimeGuard: AnyFileBasedOutboundMessageModelLifetimeGuard,
): Promise<UploadedBlobBytes> {
    type FileDataToUpload = Pick<
        CommonBaseFileMessageView,
        'fileData' | 'thumbnailFileData' | 'encryptionKey'
    >;

    // Determine which files to upload
    const fileDataToUpload: FileDataToUpload = lifetimeGuard.run((handle) => {
        const view = handle.view();
        const data: Mutable<FileDataToUpload> = {
            encryptionKey: view.encryptionKey,
        };
        if (view.blobId === undefined && view.fileData !== undefined) {
            data.fileData = view.fileData;
        }
        if (view.thumbnailBlobId === undefined && view.thumbnailFileData !== undefined) {
            data.thumbnailFileData = view.thumbnailFileData;
        }
        return data;
    });
    if (
        fileDataToUpload.fileData === undefined &&
        fileDataToUpload.thumbnailFileData === undefined
    ) {
        // Nothing to upload
        return {main: undefined, thumbnail: undefined};
    }

    // Upload all blobs concurrently
    const promises = [];
    if (fileDataToUpload.fileData !== undefined) {
        lifetimeGuard.update((view) => ({state: 'syncing'}));
        promises.push(
            uploadFileAsBlob(
                'main',
                fileDataToUpload.fileData,
                BLOB_FILE_NONCE,
                fileDataToUpload.encryptionKey,
                services,
            ),
        );
    }
    if (fileDataToUpload.thumbnailFileData !== undefined) {
        promises.push(
            uploadFileAsBlob(
                'thumbnail',
                fileDataToUpload.thumbnailFileData,
                BLOB_THUMBNAIL_NONCE,
                fileDataToUpload.encryptionKey,
                services,
            ),
        );
    }
    const blobIdPromiseResults = await Promise.all(promises);

    // Process promise results and determine database change
    const change: Mutable<Pick<OutboundBaseFileMessageView, 'blobId' | 'thumbnailBlobId'>> = {};
    const uploadedBlobBytes: Mutable<UploadedBlobBytes> = {main: undefined, thumbnail: undefined};
    for (const promiseResult of blobIdPromiseResults) {
        if (hasProperty(promiseResult, 'blobId')) {
            change.blobId = promiseResult.blobId;
            uploadedBlobBytes.main = promiseResult.bytes;
        }
        if (hasProperty(promiseResult, 'thumbnailBlobId')) {
            change.thumbnailBlobId = promiseResult.thumbnailBlobId;
            uploadedBlobBytes.thumbnail = promiseResult.bytes;
        }
    }

    // Update database and view
    lifetimeGuard.update(() => {
        // Note: updateMessage cannot return a list of deleted files in this case because we
        // only update the blob ids. Thus we can ignore the return value.
        services.db.updateMessage(conversationUid, {
            ...change,
            uid: messageUid,
            type: messageType,
        });
        return {...change, state: 'synced'};
    });

    return uploadedBlobBytes;
}

export async function overwriteThumbnail(
    bytes: ReadonlyUint8Array,
    messageType: AnyNonDeletedMessageType,
    messageUid: DbMessageUid,
    conversationUid: DbConversationUid,
    services: Pick<ServicesForModel, 'db' | 'file'>,
    lifetimeGuard: AnyFileBasedMessageModelLifetimeGuard,
    log: Logger,
): Promise<void> {
    const {file} = services;
    let storedFile;
    try {
        storedFile = await file.store(bytes);
    } catch (error) {
        const message = `Could not write bytes to file system: ${error}`;
        if (error instanceof FileStorageError) {
            throw new BlobFetchError({kind: 'file-storage-error', cause: error.type}, message);
        }
        throw new BlobFetchError({kind: 'file-storage-error'}, message);
    }
    const storedFileData = {
        fileId: storedFile.fileId,
        encryptionKey: storedFile.encryptionKey,
        unencryptedByteCount: bytes.byteLength,
        storageFormatVersion: storedFile.storageFormatVersion,
    };

    // Update database
    const dbChange = {thumbnailFileData: storedFileData, thumbnailBlobDownloadState: undefined};
    const viewChange = {...dbChange};
    lifetimeGuard.update(() => {
        updateFileBasedMessage(services, log, messageType, conversationUid, messageUid, dbChange);
        return viewChange;
    });
}

/**
 * Re-generate the thumbnail for a message from the specified media bytes, store it in the database
 * and update the thumbnail cache.
 *
 * @param messageType The message type.
 * @param messageModelController The controller of the message.
 * @param mediaBytes The full-size media bytes used to re-generate the thumbnail.
 * @param services Model services.
 * @param log The logger instance.
 */
export async function regenerateThumbnail(
    messageType: StrictExtract<MessageType, 'image' | 'video'>,
    messageModelController:
        | InboundImageMessageController
        | InboundVideoMessageController
        | OutboundImageMessageController,
    mediaBytes: ReadonlyUint8Array,
    services: Pick<ServicesForModel, 'db' | 'file' | 'media'>,
    log: Logger,
): Promise<void> {
    const {media} = services;

    const {messageId, mediaType} = messageModelController.meta.run((handle) => ({
        mediaType: handle.view().mediaType,
        messageId: handle.view().id,
    }));

    // Generate new thumbnail from the provided bytes
    const newThumbnail = await media.generateThumbnail(mediaBytes, messageType, mediaType);
    if (newThumbnail !== undefined) {
        const conversationModel = messageModelController.conversation().get();

        // Store updated thumbnail in filesystem and database
        await overwriteThumbnail(
            mediaBytes,
            messageType,
            messageModelController.uid,
            conversationModel.ctx,
            services,
            messageModelController.meta,
            log,
        );

        // Make the new thumbnail visible to the frontend
        const receiverLookup = messageModelController.conversation().get()
            .controller.receiverLookup;
        await media.refreshThumbnailCacheForMessage(messageId, receiverLookup);
    }
}
