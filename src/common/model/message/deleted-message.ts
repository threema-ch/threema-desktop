import type {DbDeletedMessage, DbMessageUid, UidOf} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import {CommonBaseMessageController} from '~/common/model/message';
import {NO_SENDER} from '~/common/model/message/common';
import type {ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {AnyDeletedMessageModelStore, BaseMessageView} from '~/common/model/types/message';
import type {
    InboundDeletedMessage,
    InboundDeletedMessageController,
    InboundDeletedMessageView,
    OutboundDeletedMessage,
    OutboundDeletedMessageController,
    OutboundDeletedMessageView,
} from '~/common/model/types/message/deleted';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export function commonToDeletedView<TMessageDirection extends MessageDirection>(
    common: BaseMessageView<TMessageDirection>,
): InboundDeletedMessageView | OutboundDeletedMessageView {
    assert(common.deletedAt !== undefined);

    switch (common.direction) {
        case MessageDirection.INBOUND:
            return {
                createdAt: common.createdAt,
                deletedAt: common.deletedAt,
                direction: common.direction,
                history: [],
                id: common.id,
                lastEditedAt: undefined,
                ordinal: common.ordinal,
                reactions: [],
                receivedAt: common.receivedAt,
                raw: undefined,
                readAt: common.readAt,
            };
        case MessageDirection.OUTBOUND:
            return {
                createdAt: common.createdAt,
                deletedAt: common.deletedAt,
                direction: common.direction,
                history: [],
                id: common.id,
                lastEditedAt: undefined,
                ordinal: common.ordinal,
                reactions: [],
                readAt: common.readAt,
                sentAt: common.sentAt,
            };

        default:
            return unreachable(common);
    }
}

export function getDeletedMessageModelStore(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    view: InboundDeletedMessageView | OutboundDeletedMessageView,
    uid: DbMessageUid,
    sender: LocalModelStore<Contact> | typeof NO_SENDER,
): AnyDeletedMessageModelStore {
    switch (view.direction) {
        case MessageDirection.OUTBOUND:
            return new OutboundDeletedMessageModelStore(services, view, uid, conversation);
        case MessageDirection.INBOUND:
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${MessageType.DELETED} message ${uid} to exist`,
            );
            return new InboundDeletedMessageModelStore(services, view, uid, conversation, sender);

        default:
            return unreachable(view);
    }
}

class InboundDeletedMessageModelController
    extends CommonBaseMessageController<InboundDeletedMessageView>
    implements InboundDeletedMessageController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public override readonly meta = new ModelLifetimeGuard<InboundDeletedMessageView>();

    public constructor(
        uid: UidOf<DbDeletedMessage>,
        type: MessageType,
        conversation: ConversationControllerHandle,
        services: ServicesForModel,
        private readonly _sender: LocalModelStore<Contact>,
    ) {
        super(uid, type, conversation, services);
    }

    /** @inheritdoc */
    public sender(): LocalModelStore<Contact> {
        return this._sender;
    }
}

class OutboundDeletedMessageModelController
    extends CommonBaseMessageController<OutboundDeletedMessageView>
    implements OutboundDeletedMessageController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public override readonly meta = new ModelLifetimeGuard<OutboundDeletedMessageView>();
}

export class InboundDeletedMessageModelStore extends LocalModelStore<
    InboundDeletedMessage['model']
> {
    public constructor(
        services: ServicesForModel,
        view: InboundDeletedMessage['view'],
        uid: UidOf<DbDeletedMessage>,
        conversation: ConversationControllerHandle,
        sender: LocalModelStore<Contact>,
    ) {
        const {logging} = services;
        const tag = `message.inbound.deleted.${uid}`;
        super(
            view,
            new InboundDeletedMessageModelController(
                uid,
                MessageType.DELETED,
                conversation,
                services,
                sender,
            ),
            MessageDirection.INBOUND,
            MessageType.DELETED,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

export class OutboundDeletedMessageModelStore extends LocalModelStore<
    OutboundDeletedMessage['model']
> {
    public constructor(
        services: ServicesForModel,
        view: OutboundDeletedMessage['view'],
        uid: UidOf<DbDeletedMessage>,
        conversation: ConversationControllerHandle,
    ) {
        const {logging} = services;
        const tag = `message.outbound.deleted.${uid}`;
        super(
            view,
            new OutboundDeletedMessageModelController(
                uid,
                MessageType.DELETED,
                conversation,
                services,
            ),
            MessageDirection.OUTBOUND,
            MessageType.DELETED,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
