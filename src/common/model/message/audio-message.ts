import type {
    DbAudioMessage,
    DbCreateMessage,
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
    uploadBlobs,
    type UploadedBlobBytes,
} from '~/common/model/message/common';
import type {GuardedStoreHandle, ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyAudioMessageModelStore,
    BaseMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
    UnifiedEditMessage,
} from '~/common/model/types/message';
import type {
    CommonAudioMessageView,
    InboundAudioMessage,
    InboundAudioMessageController,
    OutboundAudioMessage,
    OutboundAudioMessageController,
} from '~/common/model/types/message/audio';
import {ModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {AsyncLock} from '~/common/utils/lock';

/**
 * Create and return an audio message in the database.
 */
export function createAudioMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.AUDIO>, 'uid' | 'type' | 'ordinal'>,
    init: DirectedMessageFor<TDirection, MessageType.AUDIO, 'init'>,
): DbAudioMessage {
    const {db} = services;

    // Create audio message
    const message: DbCreateMessage<DbAudioMessage> = {
        ...common,
        ...init,
    };
    const uid = db.createAudioMessage(message);
    // Cast is ok here because we know this `uid` is an audio message
    return db.getMessageByUid(uid) as DbAudioMessage;
}

/**
 * Return a local model store for the specified audio message.
 */
export function getAudioMessageModelStore<TModelStore extends AnyAudioMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbMessageFor<TModelStore['type']>,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: ModelStore<Contact> | typeof NO_SENDER,
): TModelStore {
    const audio: Omit<CommonAudioMessageView, keyof CommonBaseMessageView> = {
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
    };
    switch (common.direction) {
        case MessageDirection.INBOUND: {
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${message.type} message ${message.uid} to exist`,
            );
            return new InboundAudioMessageModelStore(
                services,
                {...common, ...audio},
                message.uid,
                conversation,
                sender,
            ) as TModelStore; // Trivially true as common.direction === TModelStore['ctx']
        }
        case MessageDirection.OUTBOUND: {
            return new OutboundAudioMessageModelStore(
                services,
                {...common, ...audio},
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
export class InboundAudioMessageModelController
    extends InboundBaseMessageModelController<InboundAudioMessage['view']>
    implements InboundAudioMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            MessageType.AUDIO,
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
            MessageType.AUDIO,
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

    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<InboundAudioMessage['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        message.update((view) =>
            updateFileBasedMessageCaption(
                this._services,
                MessageType.AUDIO,
                this.uid,
                view,
                editedMessage,
            ),
        );
    }
}

/**
 * Controller for outbound audio messages.
 */
export class OutboundAudioMessageModelController
    extends OutboundBaseMessageModelController<OutboundAudioMessage['view']>
    implements OutboundAudioMessageController
{
    protected readonly _blobLock = new AsyncLock();
    protected readonly _thumbnailBlobLock = new AsyncLock();

    /** @inheritdoc */
    public async blob(): Promise<FileBytesAndMediaType> {
        const blob = await loadOrDownloadBlob(
            'main',
            MessageType.AUDIO,
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
            MessageType.AUDIO,
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
            MessageType.AUDIO,
            this.uid,
            this._conversation.uid,
            this._services,
            this.meta,
        );
    }

    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<OutboundAudioMessage['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        message.update((view) =>
            updateFileBasedMessageCaption(
                this._services,
                MessageType.AUDIO,
                this.uid,
                view,
                editedMessage,
            ),
        );
    }
}

export class InboundAudioMessageModelStore extends ModelStore<InboundAudioMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundAudioMessage['view'],
        uid: UidOf<DbAudioMessage>,
        conversation: ConversationControllerHandle,
        sender: ModelStore<Contact>,
    ) {
        const {logging} = services;
        const tag = `message.inbound.audio.${uid}`;
        super(
            view,
            new InboundAudioMessageModelController(
                services,
                uid,
                MessageType.AUDIO,
                conversation,
                sender,
            ),
            MessageDirection.INBOUND,
            MessageType.AUDIO,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

export class OutboundAudioMessageModelStore extends ModelStore<OutboundAudioMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: OutboundAudioMessage['view'],
        uid: UidOf<DbAudioMessage>,
        conversation: ConversationControllerHandle,
    ) {
        const {logging} = services;
        const tag = `message.outbound.audio.${uid}`;
        super(
            view,
            new OutboundAudioMessageModelController(services, uid, MessageType.AUDIO, conversation),
            MessageDirection.OUTBOUND,
            MessageType.AUDIO,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
