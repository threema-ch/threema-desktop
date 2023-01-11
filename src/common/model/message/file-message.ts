import {
    type DbConversationUid,
    type DbCreate,
    type DbFileMessage,
    type DbMessageCommon,
} from '~/common/db';
import {MessageDirection, MessageType, ReceiverType} from '~/common/enum';
import {deleteFilesInBackground} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {
    type AnyFileMessageModelStore,
    type BaseMessageView,
    type Contact,
    type ConversationControllerHandle,
    type DirectedMessageFor,
    type FileData,
    type FileMessageViewFragment,
    type InboundConversationPreviewMessageView,
    type InboundFileMessage,
    type InboundFileMessageController,
    type OutboundConversationPreviewMessageView,
    type OutboundFileMessage,
    type OutboundFileMessageController,
    type ServicesForModel,
    type UidOf,
    PREVIEW_MESSAGE_MAX_TEXT_LENGTH,
} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type BlobScope} from '~/common/network/protocol/blob';
import {type ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
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
function updateFileMessage<TView extends FileMessageViewFragment>(
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
        fileData: message.fileData,
        thumbnailFileData: message.thumbnailFileData,
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

export class InboundFileMessageModelController
    extends InboundBaseMessageModelController<InboundFileMessage['view']>
    implements InboundFileMessageController
{
    /**
     * Async lock to guard blob download logic.
     */
    private readonly _lock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<ReadonlyUint8Array> {
        return await this._blob('main');
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<ReadonlyUint8Array | undefined> {
        return await this._blob('thumbnail');
    }

    protected async _blob(type: 'main'): Promise<ReadonlyUint8Array>;
    protected async _blob(type: 'thumbnail'): Promise<ReadonlyUint8Array | undefined>;
    /**
     * Download blob of the specified type.
     *
     * If the blob has not yet been downloaded, the download will be started and the database will
     * be updated. Once that is done, the promise will resolve with the blob data.
     */
    protected async _blob(type: 'main' | 'thumbnail'): Promise<ReadonlyUint8Array | undefined> {
        const {blob, file} = this._services;

        // Because the download logic is async and consists of multiple steps, we need a lock to
        // avoid races where the same blob is downloaded multiple times.
        return await this._lock.with(async () => {
            // If blob is already downloaded (i.e. a fileId is set), return it.
            const existingFileData: FileData | undefined = this.meta.run((handle) => {
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

            // Otherwise, download it from the blob mirror.
            const blobId = this.meta.run((handle) => {
                switch (type) {
                    case 'main':
                        return handle.view().blobId;
                    case 'thumbnail':
                        return handle.view().thumbnailBlobId;
                    default:
                        return unreachable(type);
                }
            });
            if (blobId === undefined) {
                assert(type !== 'main', 'Expected a blob id to be available for the main file');
                return undefined;
            }
            const downloadResult = await blob.download('public', blobId);

            // Blob downloaded, store in file storage
            const blobBytes = downloadResult.data;
            const storedFile = await file.store(blobBytes);
            const storedFileData = {
                fileId: storedFile.fileId,
                encryptionKey: storedFile.encryptionKey,
                unencryptedByteCount: blobBytes.byteLength,
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
            this.meta.update(() => {
                updateFileMessage(
                    this._services,
                    this._log,
                    this._conversation.uid,
                    this._uid,
                    change,
                );
                return change;
            });

            // Mark as downloaded
            //
            // Note: This is done in the background, we don't await the result of the done call.
            let blobDoneScope: BlobScope;
            switch (this._conversation.receiverLookup.type) {
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
                    unreachable(this._conversation.receiverLookup);
            }
            downloadResult.done(blobDoneScope).catch((e) => {
                this._log.error(`Failed to mark blob with id ${bytesToHex(blobId)} as done`, e);
            });

            // Return data
            return blobBytes;
        });
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
    /** @inheritdoc */
    public async blob(): Promise<ReadonlyUint8Array> {
        const fileData = this.meta.run((handle) => handle.view().fileData);
        assert(fileData !== undefined, 'File data for outgoing message is undefined');
        return await this._services.file.load(fileData);
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<ReadonlyUint8Array | undefined> {
        const thumbnailFileData = this.meta.run((handle) => handle.view().thumbnailFileData);
        return thumbnailFileData === undefined
            ? undefined
            : await this._services.file.load(thumbnailFileData);
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
