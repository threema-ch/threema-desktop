import type {
    DbCreateMessage,
    DbMessageCommon,
    DbMessageFor,
    DbVideoMessage,
    UidOf,
} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import {
    InboundBaseMessageModelController,
    OutboundBaseMessageModelController,
    updateFileBasedMessageCaption,
} from '~/common/model/message';
import {
    loadOrDownloadBlob,
    getFileMessageDataState,
    NO_SENDER,
    uploadBlobs,
    type UploadedBlobBytes,
} from '~/common/model/message/common';
import type {GuardedStoreHandle, ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyVideoMessageModelStore,
    BaseMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
    UnifiedEditMessage,
} from '~/common/model/types/message';
import type {
    CommonVideoMessageView,
    InboundVideoMessageBundle,
    InboundVideoMessageController,
    OutboundVideoMessageBundle,
    OutboundVideoMessageController,
} from '~/common/model/types/message/video';
import {ModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {AsyncLock} from '~/common/utils/lock';

/**
 * Create and return an video message in the database.
 */
export function createVideoMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.VIDEO>, 'uid' | 'type' | 'ordinal'>,
    init: DirectedMessageFor<TDirection, MessageType.VIDEO, 'init'>,
): DbVideoMessage {
    const {db} = services;

    // Create video message
    const message: DbCreateMessage<DbVideoMessage> = {
        ...common,
        ...init,
    };
    const uid = db.createVideoMessage(message);
    // Cast is ok here because we know this `uid` is an video message
    return db.getMessageByUid(uid) as DbVideoMessage;
}

/**
 * Return a local model store for the specified video message.
 */
export function getVideoMessageModelStore<TModelStore extends AnyVideoMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbMessageFor<TModelStore['type']>,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: ModelStore<Contact> | typeof NO_SENDER,
): TModelStore {
    const video: Omit<CommonVideoMessageView, keyof CommonBaseMessageView> = {
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
        state: getFileMessageDataState(message),
        blobDownloadState: message.blobDownloadState,
        thumbnailBlobDownloadState: message.thumbnailBlobDownloadState,
        duration: message.duration,
        dimensions: message.dimensions,
    };
    switch (common.direction) {
        case MessageDirection.INBOUND: {
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${message.type} message ${message.uid} to exist`,
            );
            return new InboundVideoMessageModelStore(
                services,
                {...common, ...video},
                message.uid,
                conversation,
                sender,
            ) as TModelStore; // Trivially true as common.direction === TModelStore['ctx']
        }
        case MessageDirection.OUTBOUND: {
            return new OutboundVideoMessageModelStore(
                services,
                {...common, ...video},
                message.uid,
                conversation,
            ) as TModelStore; // Trivially true as common.direction === TModelStore['ctx']
        }
        default:
            return unreachable(common);
    }
}

/**
 * Controller for inbound file messages.
 */
export class InboundVideoMessageModelController
    extends InboundBaseMessageModelController<InboundVideoMessageBundle['view']>
    implements InboundVideoMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            MessageType.VIDEO,
            MessageDirection.INBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._blobLock,
            this.lifetimeGuard,
            this._log,
        );

        // TODO(DESK-1306): Enable regeneration only when generation of thumbnails from video files
        // is implemented.
        // if (blob.source === 'network') {
        //     // If the blob was just downloaded, re-generate a high-res thumbnail from the actual
        //     // video bytes in the background.
        //     //
        //     // Note: We re-generate thumbnails for two reasons: To get better image quality, and to
        //     // ensure that the thumbnail really matches the actual video data.
        //     regenerateThumbnail('video', this, blob.data.bytes, this._services, this._log).catch(assertUnreachable);
        // }

        return blob.data;
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<FileBytesAndMediaType | undefined> {
        const blob = await loadOrDownloadBlob(
            'thumbnail',
            MessageType.VIDEO,
            MessageDirection.INBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._thumbnailBlobLock,
            this.lifetimeGuard,
            this._log,
        );
        return blob?.data;
    }

    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<InboundVideoMessageBundle['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        message.update((view) =>
            updateFileBasedMessageCaption(
                this._services,
                MessageType.VIDEO,
                this.uid,
                view,
                editedMessage,
            ),
        );
    }
}

/**
 * Controller for outbound video messages.
 */
export class OutboundVideoMessageModelController
    extends OutboundBaseMessageModelController<OutboundVideoMessageBundle['view']>
    implements OutboundVideoMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            MessageType.VIDEO,
            MessageDirection.OUTBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._blobLock,
            this.lifetimeGuard,
            this._log,
        );
        return blob.data;
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<FileBytesAndMediaType | undefined> {
        const blob = await loadOrDownloadBlob(
            'thumbnail',
            MessageType.VIDEO,
            MessageDirection.OUTBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._thumbnailBlobLock,
            this.lifetimeGuard,
            this._log,
        );
        return blob?.data;
    }

    /** @inheritdoc */
    public async uploadBlobs(): Promise<UploadedBlobBytes> {
        return await uploadBlobs(
            MessageType.VIDEO,
            this.uid,
            this._conversation.uid,
            this._services,
            this.lifetimeGuard,
        );
    }

    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<OutboundVideoMessageBundle['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        message.update((view) =>
            updateFileBasedMessageCaption(
                this._services,
                MessageType.VIDEO,
                this.uid,
                view,
                editedMessage,
            ),
        );
    }
}

export class InboundVideoMessageModelStore extends ModelStore<InboundVideoMessageBundle['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundVideoMessageBundle['view'],
        uid: UidOf<DbVideoMessage>,
        conversation: ConversationControllerHandle,
        sender: ModelStore<Contact>,
    ) {
        const {logging} = services;
        const tag = `message.inbound.video.${uid}`;
        super(
            view,
            new InboundVideoMessageModelController(
                services,
                uid,
                MessageType.VIDEO,
                conversation,
                sender,
            ),
            MessageDirection.INBOUND,
            MessageType.VIDEO,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

export class OutboundVideoMessageModelStore extends ModelStore<
    OutboundVideoMessageBundle['model']
> {
    public constructor(
        services: ServicesForModel,
        view: OutboundVideoMessageBundle['view'],
        uid: UidOf<DbVideoMessage>,
        conversation: ConversationControllerHandle,
    ) {
        const {logging} = services;
        const tag = `message.outbound.video.${uid}`;
        super(
            view,
            new OutboundVideoMessageModelController(services, uid, MessageType.VIDEO, conversation),
            MessageDirection.OUTBOUND,
            MessageType.VIDEO,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
