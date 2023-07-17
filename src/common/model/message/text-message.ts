import {type DbCreate, type DbMessageCommon, type DbTextMessage, type UidOf} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import {type Contact, type ServicesForModel} from '~/common/model';
import {type ConversationControllerHandle} from '~/common/model/types/conversation';
import {
    type AnyTextMessageModelStore,
    type BaseMessageView,
    type CommonBaseMessageView,
    type DirectedMessageFor,
} from '~/common/model/types/message';
import {
    type CommonTextMessageView,
    type IInboundTextMessageModelStore,
    type InboundTextMessage,
    type InboundTextMessageController,
    type InboundTextMessageModel,
    type IOutboundTextMessageModelStore,
    type OutboundTextMessage,
    type OutboundTextMessageController,
    type OutboundTextMessageModel,
} from '~/common/model/types/message/text';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';

import {InboundBaseMessageModelController, NO_SENDER, OutboundBaseMessageModelController} from '.';

export function createTextMessage<TDirection extends MessageDirection>(
    services: ServicesForModel,
    common: Omit<DbMessageCommon<MessageType.TEXT>, 'uid' | 'type'>,
    init: DirectedMessageFor<TDirection, MessageType.TEXT, 'init'>,
): DbTextMessage {
    const {db} = services;

    // Create text message
    const message: DbCreate<DbTextMessage> = {
        ...common,
        type: MessageType.TEXT,
        text: init.text,
        quotedMessageId: init.quotedMessageId,
    };
    const uid = db.createTextMessage(message);
    return {...message, uid};
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
    implements InboundTextMessageController {}

export class OutboundTextMessageModelController
    extends OutboundBaseMessageModelController<OutboundTextMessage['view']>
    implements OutboundTextMessageController {}

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
