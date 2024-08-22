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
    MessageHistoryViewEntry,
    UnifiedEditMessage,
} from '~/common/model/types/message';
import type {
    CommonTextMessageView,
    IInboundTextMessageModelStore,
    InboundTextMessageBundle,
    InboundTextMessageController,
    InboundTextMessageModel,
    IOutboundTextMessageModelStore,
    OutboundTextMessageBundle,
    OutboundTextMessageController,
    OutboundTextMessageModel,
} from '~/common/model/types/message/text';
import {ModelStore} from '~/common/model/utils/model-store';
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
    sender: ModelStore<Contact> | typeof NO_SENDER,
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
    extends InboundBaseMessageModelController<InboundTextMessageBundle['view']>
    implements InboundTextMessageController
{
    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<InboundTextMessageBundle['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        const change = {
            lastEditedAt: editedMessage.lastEditedAt,
            text: editedMessage.newText,
        };
        message.update((view) => {
            editMessageByMessageUid(this._services, this.uid, MessageType.TEXT, change);
            const newHistory: MessageHistoryViewEntry[] =
                view.history.length === 0
                    ? [{text: view.text, editedAt: view.createdAt}]
                    : [...view.history];
            newHistory.push({
                editedAt: editedMessage.lastEditedAt,
                text: editedMessage.newText,
            });
            return {...change, history: newHistory};
        });
    }
}

export class OutboundTextMessageModelController
    extends OutboundBaseMessageModelController<OutboundTextMessageBundle['view']>
    implements OutboundTextMessageController
{
    /** @inheritdoc */
    protected override _editMessage(
        message: GuardedStoreHandle<OutboundTextMessageBundle['view']>,
        editedMessage: UnifiedEditMessage,
    ): void {
        const change = {
            lastEditedAt: editedMessage.lastEditedAt,
            text: editedMessage.newText,
        };
        message.update((view) => {
            editMessageByMessageUid(this._services, this.uid, MessageType.TEXT, change);
            const newHistory: MessageHistoryViewEntry[] =
                view.history.length === 0
                    ? [{text: view.text, editedAt: view.createdAt}]
                    : [...view.history];
            newHistory.push({
                editedAt: editedMessage.lastEditedAt,
                text: editedMessage.newText,
            });
            return {...change, history: newHistory};
        });
    }
}

export class InboundTextMessageModelStore
    extends ModelStore<InboundTextMessageModel>
    implements IInboundTextMessageModelStore
{
    public constructor(
        services: ServicesForModel,
        view: InboundTextMessageBundle['view'],
        uid: UidOf<DbTextMessage>,
        conversation: ConversationControllerHandle,
        sender: ModelStore<Contact>,
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
    extends ModelStore<OutboundTextMessageModel>
    implements IOutboundTextMessageModelStore
{
    public constructor(
        services: ServicesForModel,
        view: OutboundTextMessageBundle['view'],
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
