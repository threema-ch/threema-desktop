import type {DbDeletedMessage, DbMessageUid, UidOf} from '~/common/db';
import {MessageDirection, MessageType} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import {CommonBaseMessageController} from '~/common/model/message';
import {NO_SENDER} from '~/common/model/message/common';
import type {ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {AnyDeletedMessageModelStore, BaseMessageView} from '~/common/model/types/message';
import type {
    InboundDeletedMessageBundle,
    InboundDeletedMessageController,
    InboundDeletedMessageView,
    OutboundDeletedMessageBundle,
    OutboundDeletedMessageController,
    OutboundDeletedMessageView,
} from '~/common/model/types/message/deleted';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {ensureEmptyArray} from '~/common/utils/array';
import {assert, ensureUndefined, unreachable, unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

export function getDeletedMessageModelStore<TMessageDirection extends MessageDirection>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    common: BaseMessageView<TMessageDirection>,
    uid: DbMessageUid,
    sender: ModelStore<Contact> | typeof NO_SENDER,
): AnyDeletedMessageModelStore {
    switch (common.direction) {
        case MessageDirection.OUTBOUND: {
            const view: OutboundDeletedMessageView = {
                ...common,
                deletedAt: unwrap(common.deletedAt),
                history: ensureEmptyArray(common.history),
                reactions: ensureEmptyArray(common.history),
                lastEditedAt: ensureUndefined(common.lastEditedAt),
            };

            return new OutboundDeletedMessageModelStore(services, view, uid, conversation);
        }
        case MessageDirection.INBOUND: {
            assert(
                sender !== NO_SENDER,
                `Expected sender of inbound ${MessageType.DELETED} message ${uid} to exist`,
            );
            assert(common.raw.byteLength === 0, 'Deleted message cannot have a raw body');
            const view: InboundDeletedMessageView = {
                ...common,
                deletedAt: unwrap(common.deletedAt),
                history: ensureEmptyArray(common.history),
                reactions: ensureEmptyArray(common.history),
                lastEditedAt: ensureUndefined(common.lastEditedAt),
            };
            return new InboundDeletedMessageModelStore(services, view, uid, conversation, sender);
        }
        default:
            return unreachable(common);
    }
}

/**
 * Update the timestamp of a deleted message. It is the responsibility of the caller to make sure
 * the message direction and the updated timestamps match.
 *
 * @throws if the message was not found or not deleted yet.
 *
 * Note: ReceivedAt is not necessary here, since a normal message always preceeds a delete message.
 * Therefore, the received at timestamp will be updated before the message can be deleted.
 */
function update(
    services: ServicesForModel,
    uid: DbMessageUid,
    change: {readAt: Date} | {deliveredAt: Date},
): void {
    const updated = services.db.updateDeletedMessageTimestamps(uid, change);
    if (!updated) {
        throw new Error(
            `Could not update timestamp of message with UID ${uid} from database because its type was not "deleted" or it could not be found.`,
        );
    }
}

/**
 * Controller for inbound deleted messages.
 *
 * Note: This extends `CommonBaseMessageController` and not `InboundBaseMessageModelController`
 * because many actions that are valid for regular messages (e.g. reactions) are not valid on
 * deleted messages.
 */
class InboundDeletedMessageModelController
    extends CommonBaseMessageController<InboundDeletedMessageView>
    implements InboundDeletedMessageController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public override readonly lifetimeGuard = new ModelLifetimeGuard<InboundDeletedMessageView>();

    public readonly read: OutboundDeletedMessageController['read'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (readAt: Date) => this._handleRead(readAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, readAt: Date) =>
            this._handleRead(readAt),
    };

    public constructor(
        uid: UidOf<DbDeletedMessage>,
        type: MessageType,
        conversation: ConversationControllerHandle,
        services: ServicesForModel,
        private readonly _sender: ModelStore<Contact>,
    ) {
        super(uid, type, conversation, services);
    }

    /** @inheritdoc */
    public sender(): ModelStore<Contact> {
        return this._sender;
    }

    private _handleRead(readAt: Date): void {
        this.lifetimeGuard.run((handle) => {
            // Ignore if already marked as read
            if (handle.view().readAt !== undefined) {
                return;
            }
            // Update the message
            handle.update(() => {
                const change = {readAt};
                update(this._services, this.uid, {readAt});
                return change;
            });

            this._conversation.decrementUnreadMessageCount();
        });
    }
}

/**
 * Controller for outbound deleted messages.
 *
 * Note: This extends `CommonBaseMessageController` and not `OutboundBaseMessageModelController`
 * because many actions that are valid for regular messages (e.g. reactions or edits) are not valid on
 * deleted messages.
 */
class OutboundDeletedMessageModelController
    extends CommonBaseMessageController<OutboundDeletedMessageView>
    implements OutboundDeletedMessageController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public override readonly lifetimeGuard = new ModelLifetimeGuard<OutboundDeletedMessageView>();

    public readonly delivered: OutboundDeletedMessageController['delivered'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (deliveredAt: Date) => this._handleDelivered(deliveredAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, deliveredAt: Date) =>
            this._handleDelivered(deliveredAt),
    };

    public readonly read: OutboundDeletedMessageController['read'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (readAt: Date) => this._handleRead(readAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, readAt: Date) =>
            this._handleRead(readAt),
    };

    private _handleRead(readAt: Date): void {
        this.lifetimeGuard.run((handle) => {
            // Ignore if already marked as read
            if (handle.view().readAt !== undefined) {
                return;
            }
            // Update the message
            handle.update(() => {
                const change = {readAt};
                update(this._services, this.uid, {readAt});
                return change;
            });
        });
    }

    private _handleDelivered(deliveredAt: Date): void {
        this.lifetimeGuard.run((handle) => {
            // Ignore if already marked as delivered
            if (handle.view().deliveredAt !== undefined) {
                return;
            }
            // Update the message
            handle.update(() => {
                const change = {deliveredAt};
                update(this._services, this.uid, {deliveredAt});
                return change;
            });
        });
    }
}

export class InboundDeletedMessageModelStore extends ModelStore<
    InboundDeletedMessageBundle['model']
> {
    public constructor(
        services: ServicesForModel,
        view: InboundDeletedMessageBundle['view'],
        uid: UidOf<DbDeletedMessage>,
        conversation: ConversationControllerHandle,
        sender: ModelStore<Contact>,
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

export class OutboundDeletedMessageModelStore extends ModelStore<
    OutboundDeletedMessageBundle['model']
> {
    public constructor(
        services: ServicesForModel,
        view: OutboundDeletedMessageBundle['view'],
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
