import type {
    DbCreateMessage,
    DbImageMessage,
    DbMessageCommon,
    DbMessageFor,
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
    regenerateThumbnail,
    uploadBlobs,
    type UploadedBlobBytes,
} from '~/common/model/message/common';
import type {GuardedStoreHandle, ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyImageMessageModelStore,
    BaseMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
    UnifiedEditMessage,
} from '~/common/model/types/message';
import type {
    CommonImageMessageView,
    InboundImageMessageBundle,
    InboundImageMessageController,
    OutboundImageMessageBundle,
    OutboundImageMessageController,
} from '~/common/model/types/message/image';
import {ModelStore} from '~/common/model/utils/model-store';
import type {ReadonlyUint8Array} from '~/common/types';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {AsyncLock} from '~/common/utils/lock';

/**
 * Create and return an image message in the database.
 */
export function createImageMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.IMAGE>, 'uid' | 'type' | 'ordinal'>,
    init: DirectedMessageFor<TDirection, MessageType.IMAGE, 'init'>,
): DbImageMessage {
    const {db} = services;

    // Create image message
    const message: DbCreateMessage<DbImageMessage> = {
        ...common,
        ...init,
    };
    const uid = db.createImageMessage(message);
    // Cast is ok here because we know this `uid` is an image message
    return db.getMessageByUid(uid) as DbImageMessage;
}

/**
 * Return a local model store for the specified image message.
 */
export function getImageMessageModelStore<TModelStore extends AnyImageMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbMessageFor<TModelStore['type']>,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: ModelStore<Contact> | typeof NO_SENDER,
): TModelStore {
    const image: Omit<CommonImageMessageView, keyof CommonBaseMessageView> = {
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
        renderingType: message.renderingType,
        animated: message.animated,
        dimensions: message.dimensions,
    };
    switch (common.direction) {
        case MessageDirection.INBOUND: {
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${message.type} message ${message.uid} to exist`,
            );
            return new InboundImageMessageModelStore(
                services,
                {...common, ...image},
                message.uid,
                conversation,
                sender,
            ) as TModelStore; // Trivially true as common.direction === TModelStore['ctx']
        }
        case MessageDirection.OUTBOUND: {
            return new OutboundImageMessageModelStore(
                services,
                {...common, ...image},
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
export class InboundImageMessageModelController
    extends InboundBaseMessageModelController<InboundImageMessageBundle['view']>
    implements InboundImageMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            MessageType.IMAGE,
            MessageDirection.INBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._blobLock,
            this.lifetimeGuard,
            this._log,
        );

        if (blob.source === 'network') {
            // If the blob was just downloaded, re-generate a high-res thumbnail from the actual
            // image bytes in the background.
            //
            // Note: We re-generate thumbnails for two reasons: To get better image quality, and to
            // ensure that the thumbnail really matches the actual image data.
            regenerateThumbnail('image', this, blob.data.bytes, this._services, this._log).catch(
                assertUnreachable,
            );
        }

        return blob.data;
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<FileBytesAndMediaType | undefined> {
        const blob = await loadOrDownloadBlob(
            'thumbnail',
            MessageType.IMAGE,
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
        message: GuardedStoreHandle<InboundImageMessageBundle['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        message.update((view) =>
            updateFileBasedMessageCaption(
                this._services,
                MessageType.IMAGE,
                this.uid,
                view,
                editedMessage,
            ),
        );
    }
}

/**
 * Controller for outbound image messages.
 */
export class OutboundImageMessageModelController
    extends OutboundBaseMessageModelController<OutboundImageMessageBundle['view']>
    implements OutboundImageMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            MessageType.IMAGE,
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
            MessageType.IMAGE,
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
            MessageType.IMAGE,
            this.uid,
            this._conversation.uid,
            this._services,
            this.lifetimeGuard,
        );
    }

    /** @inheritdoc */
    public async regenerateThumbnail(imageBytes: ReadonlyUint8Array): Promise<void> {
        await regenerateThumbnail('image', this, imageBytes, this._services, this._log);
    }

    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<OutboundImageMessageBundle['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        message.update((view) =>
            updateFileBasedMessageCaption(
                this._services,
                MessageType.IMAGE,
                this.uid,
                view,
                editedMessage,
            ),
        );
    }
}

export class InboundImageMessageModelStore extends ModelStore<InboundImageMessageBundle['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundImageMessageBundle['view'],
        uid: UidOf<DbImageMessage>,
        conversation: ConversationControllerHandle,
        sender: ModelStore<Contact>,
    ) {
        const {logging} = services;
        const tag = `message.inbound.image.${uid}`;
        super(
            view,
            new InboundImageMessageModelController(
                services,
                uid,
                MessageType.IMAGE,
                conversation,
                sender,
            ),
            MessageDirection.INBOUND,
            MessageType.IMAGE,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

export class OutboundImageMessageModelStore extends ModelStore<
    OutboundImageMessageBundle['model']
> {
    public constructor(
        services: ServicesForModel,
        view: OutboundImageMessageBundle['view'],
        uid: UidOf<DbImageMessage>,
        conversation: ConversationControllerHandle,
    ) {
        const {logging} = services;
        const tag = `message.outbound.image.${uid}`;
        super(
            view,
            new OutboundImageMessageModelController(services, uid, MessageType.IMAGE, conversation),
            MessageDirection.OUTBOUND,
            MessageType.IMAGE,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
