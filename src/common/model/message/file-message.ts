import {type Nonce, NONCE_UNGUARDED_TOKEN} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {
    type DbConversationUid,
    type DbCreate,
    type DbFileMessage,
    type DbMessageCommon,
    type DbMessageUid,
    type UidOf,
} from '~/common/db';
import {
    BlobDownloadState,
    MessageDirection,
    MessageDirectionUtils,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import {deleteFilesInBackground} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {type ServicesForModel} from '~/common/model/types/common';
import {type Contact} from '~/common/model/types/contact';
import {type ConversationControllerHandle} from '~/common/model/types/conversation';
import {
    type AnyFileMessageModelStore,
    type BaseMessageView,
    type CommonBaseFileMessageView,
    type CommonBaseMessageView,
    type DirectedMessageFor,
    type FileData,
    type FileMessageDataState,
    type InboundBaseFileMessageView,
    type OutboundBaseFileMessageView,
} from '~/common/model/types/message';
import {
    type InboundFileMessage,
    type InboundFileMessageController,
    type InboundFileMessageView,
    type OutboundFileMessage,
    type OutboundFileMessageController,
    type OutboundFileMessageView,
} from '~/common/model/types/message/file';
import {type ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {
    BlobBackendError,
    type BlobScope,
    encryptAndUploadBlobWithEncryptionKey,
} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE, BLOB_THUMBNAIL_NONCE} from '~/common/network/protocol/constants';
import {type RawBlobKey} from '~/common/network/types/keys';
import {type Mutable, type ReadonlyUint8Array} from '~/common/types';
import {assert, ensureError, unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {AsyncLock} from '~/common/utils/lock';

import {InboundBaseMessageModelController, NO_SENDER, OutboundBaseMessageModelController} from '.';

/**
 * Create and return a file message in the database.
 */
export function createFileMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.FILE>, 'uid' | 'type'>,
    init: DirectedMessageFor<TDirection, MessageType.FILE, 'init'>,
): DbFileMessage {
    const {db} = services;

    // Create text message
    const message: DbCreate<DbFileMessage> = {
        ...common,
        type: MessageType.FILE,
        blobId: init.blobId,
        thumbnailBlobId: init.thumbnailBlobId,
        encryptionKey: init.encryptionKey,
        fileData: init.fileData,
        thumbnailFileData: init.thumbnailFileData,
        mediaType: init.mediaType,
        thumbnailMediaType: init.thumbnailMediaType,
        fileName: init.fileName,
        fileSize: init.fileSize,
        caption: init.caption,
        correlationId: init.correlationId,
    };
    const uid = db.createFileMessage(message);
    return {...message, uid};
}

/**
 * Update a file message.
 */
function updateFileMessage<TView extends InboundFileMessageView | OutboundFileMessageView>(
    services: ServicesForModel,
    log: Logger,
    conversation: DbConversationUid,
    uid: UidOf<DbFileMessage>,
    change: Partial<TView>,
): void {
    const {db, file} = services;
    const {deletedFileIds} = db.updateMessage(conversation, {
        ...change,
        type: MessageType.FILE,
        uid,
    });
    deleteFilesInBackground(file, log, deletedFileIds);
}

/**
 * Get the download state (of the file blob) for the specified inbound or outbound file message.
 */
function getStateForFileMessage(
    message: Pick<DbFileMessage, 'blobId' | 'fileData' | 'blobDownloadState'>,
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

/**
 * Return a local model store for the specified message.
 */
export function getFileMessageModelStore<TModelStore extends AnyFileMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbFileMessage,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: LocalModelStore<Contact> | typeof NO_SENDER,
): TModelStore {
    const file: Omit<CommonBaseFileMessageView, keyof CommonBaseMessageView> = {
        fileName: message.fileName,
        fileSize: message.fileSize,
        caption: message.caption,
        mediaType: message.mediaType,
        thumbnailMediaType: message.thumbnailMediaType,
        blobId: message.blobId,
        thumbnailBlobId: message.thumbnailBlobId,
        encryptionKey: message.encryptionKey,
        fileData: message.fileData,
        thumbnailFileData: message.thumbnailFileData,
        state: getStateForFileMessage(message),
        blobDownloadState: message.blobDownloadState,
        thumbnailBlobDownloadState: message.thumbnailBlobDownloadState,
    };
    switch (common.direction) {
        case MessageDirection.INBOUND: {
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${message.type} message ${message.uid} to exist`,
            );
            return new InboundFileMessageModelStore(
                services,
                {...common, ...file},
                message.uid,
                conversation,
                sender,
            ) as TModelStore; // Trivially true as common.direction === TModelStore['ctx']
        }
        case MessageDirection.OUTBOUND: {
            return new OutboundFileMessageModelStore(
                services,
                {...common, ...file},
                message.uid,
                conversation,
            ) as TModelStore; // Trivially true as common.direction === TModelStore['ctx']
        }
        default:
            return unreachable(common);
    }
}

type BlobType = 'main' | 'thumbnail';

async function downloadBlob(
    type: 'main',
    messageDirection: MessageDirection,
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    lifetimeGuard:
        | ModelLifetimeGuard<InboundBaseFileMessageView>
        | ModelLifetimeGuard<OutboundBaseFileMessageView>,
    log: Logger,
): Promise<ReadonlyUint8Array>;
async function downloadBlob(
    type: 'thumbnail',
    messageDirection: MessageDirection,
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    lifetimeGuard:
        | ModelLifetimeGuard<InboundBaseFileMessageView>
        | ModelLifetimeGuard<OutboundBaseFileMessageView>,
    log: Logger,
): Promise<ReadonlyUint8Array | undefined>;
/**
 * Download blob of the specified type.
 *
 * If the blob has not yet been downloaded, the download will be started and the database will be
 * updated. Once that is done, the promise will resolve with the blob data.
 */
async function downloadBlob(
    type: BlobType,
    messageDirection: MessageDirection,
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    lifetimeGuard:
        | ModelLifetimeGuard<InboundBaseFileMessageView>
        | ModelLifetimeGuard<OutboundBaseFileMessageView>,
    log: Logger,
): Promise<ReadonlyUint8Array | undefined> {
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
            updateFileMessage(services, log, conversation.uid, messageUid, dbChange);
            return viewChange;
        });
    }

    // Because the download logic is async and consists of multiple steps, we need a lock to
    // avoid races where the same blob is downloaded multiple times.
    return await lock.with(async () => {
        // If blob is already downloaded (i.e. a fileId is set), return it
        const existingFileData: FileData | undefined = lifetimeGuard.run((handle) => {
            switch (type) {
                case 'main':
                    return handle.view().fileData;
                case 'thumbnail':
                    return handle.view().thumbnailFileData;
                default:
                    return unreachable(type);
            }
        });
        if (existingFileData !== undefined) {
            return await file.load(existingFileData);
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
                    throw new Error('Blob download is marked as failed');
                case 'thumbnail':
                    return undefined;
                default:
                    return unreachable(type);
            }
        }

        // Get matching blob ID and nonce
        const [blobId, nonce] = lifetimeGuard.run((handle) => {
            switch (type) {
                case 'main':
                    return [handle.view().blobId, BLOB_FILE_NONCE];
                case 'thumbnail':
                    return [handle.view().thumbnailBlobId, BLOB_THUMBNAIL_NONCE];
                default:
                    return unreachable(type);
            }
        });

        // If there is no blob ID and no file data, there's nothing to be downloaded
        if (blobId === undefined) {
            switch (type) {
                case 'main':
                    markDownloadAsPermanentlyFailed();
                    throw new Error('Both file data and blob ID are missing');
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
            } else if (type === 'main') {
                // Temporary failure. If this is about the file (and not the thumbnail), revert the
                // state to "unsynced".
                lifetimeGuard.update((view) => ({state: 'unsynced'}));
            }
            throw ensureError(error);
        }

        // Decrypt bytes
        const secretBox = crypto.getSecretBox(
            lifetimeGuard.run((handle) => handle.view().encryptionKey),
            NONCE_UNGUARDED_TOKEN,
        );
        const decryptedBytes = secretBox
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, downloadResult.data)
            .decrypt();

        // Blob downloaded, store in file storage
        const storedFile = await file.store(decryptedBytes);
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
            updateFileMessage(services, log, conversation.uid, messageUid, dbChange);
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
        downloadResult.done(blobDoneScope).catch((e) => {
            log.error(`Failed to mark blob with id ${bytesToHex(blobId)} as done`, e);
        });
        log.info(`Downloaded ${type} blob`);

        // Return data
        return decryptedBytes;
    });
}

/**
 * Controller for inbound file messages.
 */
export class InboundFileMessageModelController
    extends InboundBaseMessageModelController<InboundFileMessage['view']>
    implements InboundFileMessageController
{
    /**
     * Async lock to guard blob download logic.
     */
    protected readonly _lock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<ReadonlyUint8Array> {
        return await downloadBlob(
            'main',
            MessageDirection.INBOUND,
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
        );
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<ReadonlyUint8Array | undefined> {
        return await downloadBlob(
            'thumbnail',
            MessageDirection.INBOUND,
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
        );
    }
}

/**
 * Controller for outbound file messages.
 */
export class OutboundFileMessageModelController
    extends OutboundBaseMessageModelController<OutboundFileMessage['view']>
    implements OutboundFileMessageController
{
    /**
     * Async lock to guard blob download logic.
     */
    protected readonly _lock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<ReadonlyUint8Array> {
        return await downloadBlob(
            'main',
            MessageDirection.OUTBOUND,
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
        );
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<ReadonlyUint8Array | undefined> {
        return await downloadBlob(
            'thumbnail',
            MessageDirection.OUTBOUND,
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
        );
    }

    /** @inheritdoc */
    public async uploadBlobs(): Promise<void> {
        type FileDataToUpload = Pick<
            CommonBaseFileMessageView,
            'fileData' | 'thumbnailFileData' | 'encryptionKey'
        >;

        // Determine which files to upload
        const fileDataToUpload: FileDataToUpload = this.meta.run((handle) => {
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
            return;
        }

        // Upload all blobs concurrently
        const promises = [];
        if (fileDataToUpload.fileData !== undefined) {
            this.meta.update((view) => ({state: 'syncing'}));
            promises.push(
                this._uploadFileAsBlob(
                    'main',
                    fileDataToUpload.fileData,
                    BLOB_FILE_NONCE,
                    fileDataToUpload.encryptionKey,
                ),
            );
        }
        if (fileDataToUpload.thumbnailFileData !== undefined) {
            promises.push(
                this._uploadFileAsBlob(
                    'thumbnail',
                    fileDataToUpload.thumbnailFileData,
                    BLOB_THUMBNAIL_NONCE,
                    fileDataToUpload.encryptionKey,
                ),
            );
        }
        const blobIdPromiseResults = await Promise.all(promises);
        let blobIds: Pick<OutboundFileMessageView, 'blobId' | 'thumbnailBlobId'> = {};
        for (const blobIdPromiseResult of blobIdPromiseResults) {
            blobIds = {...blobIds, ...blobIdPromiseResult};
        }

        // Update database and view
        this.meta.update((view) => {
            const change: Mutable<Partial<OutboundFileMessageView>> = {
                ...blobIds,
            };

            // Note: updateMessage cannot return a list of deleted files in this case because we
            // only update the blob ids. Thus we can ignore the return value.
            this._services.db.updateMessage(this._conversation.uid, {
                ...change,
                uid: this._uid,
                type: this._type,
            });

            return {...change, state: 'synced'};
        });
    }

    private async _uploadFileAsBlob(
        type: BlobType,
        data: FileData,
        nonce: Nonce,
        key: RawBlobKey,
    ): Promise<Pick<OutboundFileMessageView, 'blobId' | 'thumbnailBlobId'>> {
        const bytes = await this._services.file.load(data);
        const {id} = await encryptAndUploadBlobWithEncryptionKey(
            this._services,
            bytes,
            nonce,
            key,
            'public',
        );
        switch (type) {
            case 'main':
                return {blobId: id};
            case 'thumbnail':
                return {thumbnailBlobId: id};
            default:
                return unreachable(type);
        }
    }
}

export class InboundFileMessageModelStore extends LocalModelStore<InboundFileMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundFileMessage['view'],
        uid: UidOf<DbFileMessage>,
        conversation: ConversationControllerHandle,
        sender: LocalModelStore<Contact>,
    ) {
        const {logging} = services;
        const tag = `message.inbound.file.${uid}`;
        super(
            view,
            new InboundFileMessageModelController(
                services,
                uid,
                MessageType.FILE,
                conversation,
                sender,
            ),
            MessageDirection.INBOUND,
            MessageType.FILE,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

export class OutboundFileMessageModelStore extends LocalModelStore<OutboundFileMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: OutboundFileMessage['view'],
        uid: UidOf<DbFileMessage>,
        conversation: ConversationControllerHandle,
    ) {
        const {logging} = services;
        const tag = `message.outbound.file.${uid}`;
        super(
            view,
            new OutboundFileMessageModelController(services, uid, MessageType.FILE, conversation),
            MessageDirection.OUTBOUND,
            MessageType.FILE,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

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
