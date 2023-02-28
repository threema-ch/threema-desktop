import {NONCE_UNGUARDED_TOKEN} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {
    type DbConversationUid,
    type DbCreate,
    type DbFileMessage,
    type DbMessageCommon,
    type DbMessageUid,
} from '~/common/db';
import {BlobDownloadState, MessageDirection, MessageType, ReceiverType} from '~/common/enum';
import {deleteFilesInBackground} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {
    type AnyFileMessageModelStore,
    type BaseMessageView,
    type Contact,
    type ConversationControllerHandle,
    type DirectedMessageFor,
    type FileData,
    type FileMessageDataState,
    type FileMessageViewFragment,
    type InboundConversationPreviewMessageView,
    type InboundFileMessage,
    type InboundFileMessageController,
    type InboundFileMessageView,
    type OutboundConversationPreviewMessageView,
    type OutboundFileMessage,
    type OutboundFileMessageController,
    type OutboundFileMessageView,
    PREVIEW_MESSAGE_MAX_TEXT_LENGTH,
    type ServicesForModel,
    type UidOf,
} from '~/common/model';
import {type ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {BlobBackendError, type BlobScope} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE, BLOB_THUMBNAIL_NONCE} from '~/common/network/protocol/constants';
import {type ReadonlyUint8Array} from '~/common/types';
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
    const file: FileMessageViewFragment = {
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

function getPreviewText({
    caption,
    fileName,
}: InboundFileMessage['view'] | OutboundFileMessage['view']): string | undefined {
    return (caption ?? fileName)?.slice(0, PREVIEW_MESSAGE_MAX_TEXT_LENGTH);
}

async function downloadBlob(
    type: 'main',
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    meta: ModelLifetimeGuard<InboundFileMessageView> | ModelLifetimeGuard<OutboundFileMessageView>,
    log: Logger,
    waitToAvoidConcurrencyBug?: boolean,
): Promise<ReadonlyUint8Array>;
async function downloadBlob(
    type: 'thumbnail',
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    meta: ModelLifetimeGuard<InboundFileMessageView> | ModelLifetimeGuard<OutboundFileMessageView>,
    log: Logger,
    waitToAvoidConcurrencyBug?: boolean,
): Promise<ReadonlyUint8Array | undefined>;
/**
 * Download blob of the specified type.
 *
 * If the blob has not yet been downloaded, the download will be started and the database will be
 * updated. Once that is done, the promise will resolve with the blob data.
 */
async function downloadBlob(
    type: 'main' | 'thumbnail',
    messageUid: DbMessageUid,
    conversation: ConversationControllerHandle,
    services: ServicesForModel,
    lock: AsyncLock,
    meta: ModelLifetimeGuard<InboundFileMessageView> | ModelLifetimeGuard<OutboundFileMessageView>,
    log: Logger,
    waitToAvoidConcurrencyBug = false,
): Promise<ReadonlyUint8Array | undefined> {
    const {blob, crypto, file, timer} = services;

    /**
     * Mark the download of the file or thumbnail as permenantly failed.
     *
     * If it's a file download, update the state in the view to 'failed' as well.
     */
    function markDownloadAsPermanentlyFailed(): void {
        let dbChange: Partial<FileMessageViewFragment>;
        let viewChange: Partial<FileMessageViewFragment>;
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
        meta.update(() => {
            updateFileMessage(services, log, conversation.uid, messageUid, dbChange);
            return viewChange;
        });
    }

    // Because the download logic is async and consists of multiple steps, we need a lock to
    // avoid races where the same blob is downloaded multiple times.
    return await lock.with(async () => {
        if (waitToAvoidConcurrencyBug) {
            // TODO(MED-46): Dirty, dirty workaround for concurrent blob download bug
            await timer.sleep(2000);
        }

        // If blob is already downloaded (i.e. a fileId is set), return it
        const existingFileData: FileData | undefined = meta.run((handle) => {
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
        const downloadState = meta.run((handle) => {
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
        const [blobId, nonce] = meta.run((handle) => {
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
            markDownloadAsPermanentlyFailed();
            throw new Error('Both file data and blob ID are missing');
        }

        // Otherwise, download blob from the blob mirror
        log.debug(`Downloading ${type} blob`);
        if (type === 'main') {
            meta.update((view) => ({state: 'syncing'}));
        }
        let downloadResult;
        try {
            downloadResult = await blob.download('public', blobId);
        } catch (error) {
            if (error instanceof BlobBackendError && error.type === 'not-found') {
                // Permanent failure, blob not found
                markDownloadAsPermanentlyFailed();
            } else if (type === 'main') {
                // Temporary failure. If this is about the file (and not the thumbnail), revert the
                // state to "unsynced".
                meta.update((view) => ({state: 'unsynced'}));
            }
            throw ensureError(error);
        }

        // Decrypt bytes
        const secretBox = crypto.getSecretBox(
            meta.run((handle) => handle.view().encryptionKey),
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
        let change: Partial<FileMessageViewFragment>;
        switch (type) {
            case 'main':
                change = {fileData: storedFileData};
                break;
            case 'thumbnail':
                change = {thumbnailFileData: storedFileData};
                break;
            default:
                unreachable(type);
        }
        meta.update(() => {
            updateFileMessage(services, log, conversation.uid, messageUid, change);
            switch (type) {
                case 'main':
                    return {...change, state: 'synced'};
                case 'thumbnail':
                    return change;
                default:
                    return unreachable(type);
            }
        });

        // Mark as downloaded
        //
        // Note: This is done in the background, we don't await the result of the done call.
        let blobDoneScope: BlobScope;
        switch (conversation.receiverLookup.type) {
            case ReceiverType.CONTACT:
            case ReceiverType.DISTRIBUTION_LIST:
                // For contacts and distribution lists, use public scope,
                // so that the blobs are removed from the public blob server.
                blobDoneScope = 'public';
                break;
            case ReceiverType.GROUP:
                // For groups, use local scope, so that the blobs are retained
                // for the other group members.
                blobDoneScope = 'local';
                break;
            default:
                unreachable(conversation.receiverLookup);
        }
        downloadResult.done(blobDoneScope).catch((e) => {
            log.error(`Failed to mark blob with id ${bytesToHex(blobId)} as done`, e);
        });
        log.debug(`Downloaded ${type} blob`);

        // Return data
        return decryptedBytes;
    });
}

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
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
        );
    }

    /** @inheritdoc */
    public async thumbnailBlob(
        waitToAvoidConcurrencyBug = false,
    ): Promise<ReadonlyUint8Array | undefined> {
        return await downloadBlob(
            'thumbnail',
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
            waitToAvoidConcurrencyBug,
        );
    }

    /** @inheritdoc */
    protected _preview(): InboundConversationPreviewMessageView['text'] {
        return this.meta.run((handle) => getPreviewText(handle.view()));
    }
}

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
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
        );
    }

    /** @inheritdoc */
    public async thumbnailBlob(
        waitToAvoidConcurrencyBug = false,
    ): Promise<ReadonlyUint8Array | undefined> {
        return await downloadBlob(
            'thumbnail',
            this._uid,
            this._conversation,
            this._services,
            this._lock,
            this.meta,
            this._log,
            waitToAvoidConcurrencyBug,
        );
    }

    /** @inheritdoc */
    protected _preview(): OutboundConversationPreviewMessageView['text'] {
        return this.meta.run((handle) => getPreviewText(handle.view()));
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
