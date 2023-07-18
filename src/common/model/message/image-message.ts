import {
    type DbCreate,
    type DbImageMessage,
    type DbMessageCommon,
    type DbMessageFor,
    type UidOf,
} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import {
    InboundBaseMessageModelController,
    OutboundBaseMessageModelController,
} from '~/common/model/message';
import {
    downloadBlob,
    getFileMessageDataState,
    NO_SENDER,
    uploadBlobs,
} from '~/common/model/message/common';
import {type ServicesForModel} from '~/common/model/types/common';
import {type Contact} from '~/common/model/types/contact';
import {type ConversationControllerHandle} from '~/common/model/types/conversation';
import {
    type AnyImageMessageModelStore,
    type BaseMessageView,
    type CommonBaseMessageView,
    type DirectedMessageFor,
} from '~/common/model/types/message';
import {
    type CommonImageMessageView,
    type InboundImageMessage,
    type InboundImageMessageController,
    type OutboundImageMessage,
    type OutboundImageMessageController,
} from '~/common/model/types/message/image';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {AsyncLock} from '~/common/utils/lock';

/**
 * Create and return an image message in the database.
 */
export function createImageMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.IMAGE>, 'uid' | 'type'>,
    init: DirectedMessageFor<TDirection, MessageType.IMAGE, 'init'>,
): DbImageMessage {
    const {db} = services;

    // Create image message
    const message: DbCreate<DbImageMessage> = {
        ...common,
        ...init,
    };
    const uid = db.createImageMessage(message);
    return {...message, uid};
}

/**
 * Return a local model store for the specified image message.
 */
export function getImageMessageModelStore<TModelStore extends AnyImageMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbMessageFor<TModelStore['type']>,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: LocalModelStore<Contact> | typeof NO_SENDER,
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
    extends InboundBaseMessageModelController<InboundImageMessage['view']>
    implements InboundImageMessageController
{
    /**
     * Async lock to guard blob download logic.
     */
    protected readonly _lock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<ReadonlyUint8Array> {
        return await downloadBlob(
            'main',
            this._type,
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
            this._type,
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
 * Controller for outbound image messages.
 */
export class OutboundImageMessageModelController
    extends OutboundBaseMessageModelController<OutboundImageMessage['view']>
    implements OutboundImageMessageController
{
    /**
     * Async lock to guard blob download logic.
     */
    protected readonly _lock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<ReadonlyUint8Array> {
        return await downloadBlob(
            'main',
            this._type,
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
            this._type,
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
        await uploadBlobs(this._type, this._uid, this._conversation.uid, this._services, this.meta);
    }
}

export class InboundImageMessageModelStore extends LocalModelStore<InboundImageMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundImageMessage['view'],
        uid: UidOf<DbImageMessage>,
        conversation: ConversationControllerHandle,
        sender: LocalModelStore<Contact>,
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

export class OutboundImageMessageModelStore extends LocalModelStore<OutboundImageMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: OutboundImageMessage['view'],
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
