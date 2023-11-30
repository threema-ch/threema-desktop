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
    AnyAudioMessageModelStore,
    BaseMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
} from '~/common/model/types/message';
import type {
    CommonAudioMessageView,
    InboundAudioMessage,
    InboundAudioMessageController,
    OutboundAudioMessage,
    OutboundAudioMessageController,
} from '~/common/model/types/message/audio';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
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
    sender: LocalModelStore<Contact> | typeof NO_SENDER,
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
 * Controller for outbound audio messages.
 */
export class OutboundAudioMessageModelController
    extends OutboundBaseMessageModelController<OutboundAudioMessage['view']>
    implements OutboundAudioMessageController
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

export class InboundAudioMessageModelStore extends LocalModelStore<InboundAudioMessage['model']> {
    public constructor(
        services: ServicesForModel,
        view: InboundAudioMessage['view'],
        uid: UidOf<DbAudioMessage>,
        conversation: ConversationControllerHandle,
        sender: LocalModelStore<Contact>,
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

export class OutboundAudioMessageModelStore extends LocalModelStore<OutboundAudioMessage['model']> {
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
