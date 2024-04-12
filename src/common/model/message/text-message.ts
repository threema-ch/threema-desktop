import type {DbCreateMessage, DbMessageCommon, DbTextMessage, UidOf} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import type {Contact, ServicesForModel} from '~/common/model';
import {
    InboundBaseMessageModelController,
    OutboundBaseMessageModelController,
    editMessageByMessageUid,
} from '~/common/model/message';
import {NO_SENDER} from '~/common/model/message/common';
import type {GuardedStoreHandle} from '~/common/model/types/common';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyTextMessageModelStore,
    BaseMessageView,
    CommonBaseMessageView,
    DirectedMessageFor,
    UnifiedEditMessage,
} from '~/common/model/types/message';
import type {
    CommonTextMessageView,
    IInboundTextMessageModelStore,
    InboundTextMessage,
    InboundTextMessageController,
    InboundTextMessageModel,
    IOutboundTextMessageModelStore,
    OutboundTextMessage,
    OutboundTextMessageController,
    OutboundTextMessageModel,
} from '~/common/model/types/message/text';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';

export function createTextMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.TEXT>, 'uid' | 'type' | 'ordinal'>,
    init: DirectedMessageFor<TDirection, MessageType.TEXT, 'init'>,
): DbTextMessage {
    const {db} = services;

    // Create text message
    const message: DbCreateMessage<DbTextMessage> = {
        ...common,
        type: MessageType.TEXT,
        text: init.text,
        quotedMessageId: init.quotedMessageId,
    };
    const uid = db.createTextMessage(message);
    // Cast is ok here because we know this `uid` is a text message
    return db.getMessageByUid(uid) as DbTextMessage;
}

export function getTextMessageModelStore<TModelStore extends AnyTextMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    message: DbTextMessage,
    common: BaseMessageView<TModelStore['ctx']>,
    sender: LocalModelStore<Contact> | typeof NO_SENDER,
): TModelStore {
    const text: Omit<CommonTextMessageView, keyof CommonBaseMessageView> = {
        text: message.text,
        quotedMessageId: message.quotedMessageId,
    };

    switch (common.direction) {
        case MessageDirection.INBOUND: {
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${message.type} message ${message.uid} to exist`,
            );
            return new InboundTextMessageModelStore(
                services,
                {...common, ...text},
                message.uid,
                conversation,
                sender,
            ) as TModelStore; // This is trivially true as common.direction === TModelStore['ctx']
        }
        case MessageDirection.OUTBOUND: {
            return new OutboundTextMessageModelStore(
                services,
                {...common, ...text},
                message.uid,
                conversation,
            ) as TModelStore; // This is trivially true as common.direction === TModelStore['ctx']
        }
        default:
            return unreachable(common);
    }
}

export class InboundTextMessageModelController
    extends InboundBaseMessageModelController<InboundTextMessage['view']>
    implements InboundTextMessageController
{
    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<InboundTextMessage['view']>,
        editedMessage: UnifiedEditMessage,
    ): boolean {
        if (editedMessage.newText.trim() === '') {
            this._log.warn(
                'Not applying edit on inbound message because the new text is empty. This is not allowed for text messages',
            );
            return false;
        }
        message.update((view) => {
            editMessageByMessageUid(this._services, this.uid, this._type, {
                lastEditedAt: editedMessage.lastEditedAt,
                text: editedMessage.newText,
            });
            return editedMessage;
        });
        return true;
    }
}

export class OutboundTextMessageModelController
    extends OutboundBaseMessageModelController<OutboundTextMessage['view']>
    implements OutboundTextMessageController
{
    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<OutboundTextMessage['view']>,
        editedMessage: UnifiedEditMessage,
    ): boolean {
        if (editedMessage.newText.trim() === '') {
            this._log.warn(
                'Not applying edit on outbound message because the new text is empty. This is not allowed for text messages',
            );
            return false;
        }
        message.update((view) => {
            editMessageByMessageUid(this._services, this.uid, this._type, {
                lastEditedAt: editedMessage.lastEditedAt,
                text: editedMessage.newText,
            });
            return editedMessage;
        });
        return true;
    }
}

export class InboundTextMessageModelStore
    extends LocalModelStore<InboundTextMessageModel>
    implements IInboundTextMessageModelStore
{
    public constructor(
        services: ServicesForModel,
        view: InboundTextMessage['view'],
        uid: UidOf<DbTextMessage>,
        conversation: ConversationControllerHandle,
        sender: LocalModelStore<Contact>,
    ) {
        const {logging} = services;
        const tag = `message.inbound.text.${uid}`;
        super(
            view,
            new InboundTextMessageModelController(
                services,
                uid,
                MessageType.TEXT,
                conversation,
                sender,
            ),
            MessageDirection.INBOUND,
            MessageType.TEXT,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

export class OutboundTextMessageModelStore
    extends LocalModelStore<OutboundTextMessageModel>
    implements IOutboundTextMessageModelStore
{
    public constructor(
        services: ServicesForModel,
        view: OutboundTextMessage['view'],
        uid: UidOf<DbTextMessage>,
        conversation: ConversationControllerHandle,
    ) {
        const {logging} = services;
        const tag = `message.outbound.text.${uid}`;
        super(
            view,
            new OutboundTextMessageModelController(services, uid, MessageType.TEXT, conversation),
            MessageDirection.OUTBOUND,
            MessageType.TEXT,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
