import type {DbCreate, DbMessageCommon, DbMessageFor, DbVideoMessage, UidOf} from '~/common/db';
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
import type {ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyVideoMessageModelStore,
    BaseMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
} from '~/common/model/types/message';
import type {
    CommonVideoMessageView,
    InboundVideoMessage,
    InboundVideoMessageController,
    OutboundVideoMessage,
    OutboundVideoMessageController,
} from '~/common/model/types/message/video';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {AsyncLock} from '~/common/utils/lock';

/**
 * Create and return an video message in the database.
 */
export function createVideoMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.VIDEO>, 'uid' | 'type'>,
    init: DirectedMessageFor<TDirection, MessageType.VIDEO, 'init'>,
): DbVideoMessage {
    const {db} = services;

    // Create video message
    const message: DbCreate<DbVideoMessage> = {
        ...common,
        ...init,
    };
    const uid = db.createVideoMessage(message);
    return {...message, uid};
}

/**
 * Return a local model store for the specified video message.
 */
export function getVideoMessageModelStore<TModelStore extends AnyVideoMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbMessageFor<TModelStore['type']>,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: LocalModelStore<Contact> | typeof NO_SENDER,
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
    extends InboundBaseMessageModelController<InboundVideoMessage['view']>
    implements InboundVideoMessageController
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
 * Controller for outbound video messages.
 */
export class OutboundVideoMessageModelController
    extends OutboundBaseMessageModelController<OutboundVideoMessage['view']>
    implements OutboundVideoMessageController
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

export class InboundVideoMessageModelStore extends LocalModelStore<InboundVideoMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundVideoMessage['view'],
        uid: UidOf<DbVideoMessage>,
        conversation: ConversationControllerHandle,
        sender: LocalModelStore<Contact>,
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

export class OutboundVideoMessageModelStore extends LocalModelStore<OutboundVideoMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: OutboundVideoMessage['view'],
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
