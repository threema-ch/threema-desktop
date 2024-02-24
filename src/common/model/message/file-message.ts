import type {
    DbCreateMessage,
    DbFileMessage,
    DbMessageCommon,
    DbMessageFor,
    UidOf,
} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import {
    InboundBaseMessageModelController,
    OutboundBaseMessageModelController,
} from '~/common/model/message';
import {
    loadOrDownloadBlob,
    getFileMessageDataState,
    NO_SENDER,
    uploadBlobs,
    type UploadedBlobBytes,
} from '~/common/model/message/common';
import type {ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyFileMessageModelStore,
    BaseMessageView,
    CommonBaseFileMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
} from '~/common/model/types/message';
import type {
    InboundFileMessage,
    InboundFileMessageController,
    OutboundFileMessage,
    OutboundFileMessageController,
} from '~/common/model/types/message/file';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {AsyncLock} from '~/common/utils/lock';

/**
 * Create and return a file message in the database.
 */
export function createFileMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.FILE>, 'uid' | 'type' | 'ordinal'>,
    init: DirectedMessageFor<TDirection, MessageType.FILE, 'init'>,
): DbFileMessage {
    const {db} = services;

    // Create text message
    const message: DbCreateMessage<DbFileMessage> = {
        ...common,
        ...init,
    };
    const uid = db.createFileMessage(message);
    // Cast is ok here because we know this `uid` is an file message
    return db.getMessageByUid(uid) as DbFileMessage;
}

/**
 * Return a local model store for the specified file message.
 */
export function getFileMessageModelStore<TModelStore extends AnyFileMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbMessageFor<TModelStore['type']>,
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
        state: getFileMessageDataState(message),
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

/**
 * Controller for inbound file messages.
 */
export class InboundFileMessageModelController
    extends InboundBaseMessageModelController<InboundFileMessage['view']>
    implements InboundFileMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            this._type,
            MessageDirection.INBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._blobLock,
            this.meta,
            this._log,
        );
        return blob.data;
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<FileBytesAndMediaType | undefined> {
        const blob = await loadOrDownloadBlob(
            'thumbnail',
            this._type,
            MessageDirection.INBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._thumbnailBlobLock,
            this.meta,
            this._log,
        );
        return blob?.data;
    }
}

/**
 * Controller for outbound file messages.
 */
export class OutboundFileMessageModelController
    extends OutboundBaseMessageModelController<OutboundFileMessage['view']>
    implements OutboundFileMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            this._type,
            MessageDirection.OUTBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._blobLock,
            this.meta,
            this._log,
        );
        return blob.data;
    }

    /** @inheritdoc */
    public async thumbnailBlob(): Promise<FileBytesAndMediaType | undefined> {
        const blob = await loadOrDownloadBlob(
            'thumbnail',
            this._type,
            MessageDirection.OUTBOUND,
            this.uid,
            this._conversation,
            this._services,
            this._thumbnailBlobLock,
            this.meta,
            this._log,
        );
        return blob?.data;
    }

    /** @inheritdoc */
    public async uploadBlobs(): Promise<UploadedBlobBytes> {
        return await uploadBlobs(
            this._type,
            this.uid,
            this._conversation.uid,
            this._services,
            this.meta,
        );
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
