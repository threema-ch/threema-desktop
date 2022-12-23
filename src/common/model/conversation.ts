import {type DatabaseBackend, type DbConversationUid, type DbReceiverLookup} from '~/common/db';
import {
    type MessageType,
    AcquaintanceLevel,
    CspE2eDeliveryReceiptStatus,
    Existence,
    MessageDirection,
    ReceiverType,
    TriggerSource,
} from '~/common/enum';
import {type Logger, getGroupTag} from '~/common/logging';
import {LazyWeakRef, LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type InternalActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingConversationMessageTask} from '~/common/network/protocol/task/csp/outgoing-conversation-message';
import {OutgoingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/outgoing-delivery-receipt';
import {ReflectIncomingMessageUpdateTask} from '~/common/network/protocol/task/d2d/reflect-message-update';
import {type ConversationId, type MessageId} from '~/common/network/types';
import {type i53, type Mutable, type u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {
    type Exact,
    createExactPropertyValidator,
    OPTIONAL,
} from '~/common/utils/property-validator';
import {
    type IQueryableStore,
    type ISubscribableStore,
    DeprecatedDerivedStore,
} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalSetStore} from '~/common/utils/store/set-store';

import {
    type AnyConversationPreviewMessageView,
    type AnyInboundMessageModelStore,
    type AnyMessageModelStore,
    type AnyOutboundMessageModelStore,
    type AnyReceiver,
    type AnyReceiverStore,
    type Conversation,
    type ConversationController,
    type ConversationControllerHandle,
    type ConversationRepository,
    type ConversationUpdate,
    type ConversationView,
    type DirectedMessageFor,
    type ServicesForModel,
    type SetOfAnyLocalMessageModelStore,
    type UidOf,
} from '.';
import * as contact from './contact';
import * as group from './group';
import * as message from './message';
import {MESSAGE_FACTORY} from './message/factory';

export const cache = (() => {
    const set = new LazyWeakRef<LocalSetStore<LocalModelStore<Conversation>>>();
    return {
        set,
        store: {
            [ReceiverType.CONTACT]: new LocalModelStoreCache<
                UidOf<DbReceiverLookup>,
                LocalModelStore<Conversation>
            >(set),
            [ReceiverType.DISTRIBUTION_LIST]: new LocalModelStoreCache<
                UidOf<DbReceiverLookup>,
                LocalModelStore<Conversation>
            >(set),
            [ReceiverType.GROUP]: new LocalModelStoreCache<
                UidOf<DbReceiverLookup>,
                LocalModelStore<Conversation>
            >(set),
        } as const,
    } as const;
})();

const ensureExactConversationUpdate = createExactPropertyValidator<ConversationUpdate>(
    'ConversationUpdate',
    {
        lastUpdate: OPTIONAL,
        category: OPTIONAL,
        visibility: OPTIONAL,
    },
);

export function deactivateAndPurgeCacheCascade(
    receiver: DbReceiverLookup,
    conversation: LocalModelStore<Conversation>,
): void {
    const {controller} = conversation.get();

    // Deactivate the conversation...
    controller.meta.deactivate(() => {
        // Deactivate and purge all currently cached messages of this conversation
        message.deactivateAndPurgeCache(controller.uid);

        // Purge the conversation from the conversation cache
        cache.store[receiver.type].remove(receiver.uid);
    });
}

// Function overload with constrained return type based on existence.
export function getByReceiver<TExistence extends Existence>(
    services: ServicesForModel,
    receiver: DbReceiverLookup,
    existence: TExistence,
    tag?: string,
): TExistence extends Existence.ENSURED
    ? LocalModelStore<Conversation>
    : LocalModelStore<Conversation> | undefined;

/**
 * Fetch a conversation model by its receiver.
 *
 * Note: This function assumes that existence of the receiver is ensured. And a receiver **must**
 *       always have an associated conversation.
 */
export function getByReceiver(
    services: ServicesForModel,
    receiver: DbReceiverLookup,
    existence: Existence,
    tag?: string,
): LocalModelStore<Conversation> | undefined {
    return cache.store[receiver.type].getOrAdd(receiver.uid, () => {
        const {db} = services;

        // Lookup the associated conversation
        const conversation = db.getConversationOfReceiver(receiver);
        if (existence === Existence.ENSURED) {
            assert(
                conversation !== undefined,
                `Expected conversation for receiver ${receiver.type}:${receiver.uid} to exist`,
            );
        } else if (conversation === undefined) {
            return undefined;
        }

        // Create a store
        return new ConversationModelStore(
            services,
            receiver,
            {...conversation, type: receiver.type},
            conversation.uid,
            tag ?? '???',
        );
    });
}

function update(
    services: ServicesForModel,
    receiver: DbReceiverLookup,
    change: Exact<ConversationUpdate>,
    uid: DbConversationUid,
): void {
    const {db} = services;
    db.updateConversation({...change, uid});
}

export class ConversationModelController implements ConversationController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<ConversationView>();

    public readonly read = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (readAt: Date) => this._handleRead(TriggerSource.LOCAL, readAt),
    };

    /** @inheritdoc */
    public readonly addMessage: ConversationController['addMessage'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        fromLocal: async (
            init: DirectedMessageFor<MessageDirection.OUTBOUND, MessageType, 'init'>,
        ) => {
            const receiver = this.receiver().get();

            await this._ensureDirectAcquaintanceLevelForDirectMessages(
                {source: TriggerSource.LOCAL},
                receiver,
            );

            const store = this._addMessage(init);

            // Trigger task if this message was created locally
            const {taskManager} = this._services;
            void taskManager.schedule(
                new OutgoingConversationMessageTask(this._services, receiver, store.get()),
            );

            // Return the added message
            return store;
        },
        fromSync: (init: DirectedMessageFor<MessageDirection, MessageType, 'init'>) =>
            this._addMessage(init),
        fromRemote: async (
            activeTaskHandle,
            init: DirectedMessageFor<MessageDirection.INBOUND, MessageType, 'init'>,
        ) => {
            const receiver = this.receiver();

            await this._ensureDirectAcquaintanceLevelForDirectMessages(
                {source: TriggerSource.REMOTE, handle: activeTaskHandle},
                receiver.get(),
            );

            const store = this._addMessage(init);

            // Trigger a notification
            this.meta.run((handle) => {
                // TODO(WEBMD-255): This must be delayed to prevent notifications for messages that have
                // already been acknowledged or which are going to be acknowledged by another device within
                // a small time period.
                void this._services.notification.notifyNewMessage(store, {
                    receiver,
                    view: handle.view(),
                });
            });

            // Return the added message
            return store;
        },
    };

    /** @inheritdoc */
    public readonly removeMessage: ConversationController['removeMessage'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        fromLocal: async (uid: MessageId) => {
            const messageToRemove = this.getMessage(uid);

            if (messageToRemove === undefined) {
                return await Promise.resolve();
            }

            messageToRemove.get().controller.remove();
            this._updateLastMessagePreview();

            return await Promise.resolve();
        },
    };

    private readonly _handle: ConversationControllerHandle;
    private readonly _lastMessagePreview: DeprecatedDerivedStore<
        [lastMessage: AnyMessageModelStore] | [],
        AnyConversationPreviewMessageView | undefined
    >;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _receiverLookup: DbReceiverLookup,
        public readonly uid: DbConversationUid,
        tag: string,
    ) {
        tag = `model.${tag}`;
        this._log = this._services.logging.logger(tag);
        this._handle = {
            uid,
            receiverLookup: _receiverLookup,
            conversationId: this.conversationId.bind(this),
            update: this.update.bind(this),
            decrementUnreadMessageCount: this.decrementUnreadMessageCount.bind(this),
        };

        // Get the current last message and prepare the derived store to transform each last message
        // into a preview.
        const lastMessage = message.getLastMessage(_services, this._handle, MESSAGE_FACTORY);
        this._lastMessagePreview = new DeprecatedDerivedStore(
            lastMessage !== undefined ? [lastMessage] : [],
            ([stores]) => {
                if (stores === undefined) {
                    return undefined;
                }
                const [, model] = stores;
                return model.controller.preview();
            },
        );
    }

    /**
     * Return the {@link ConversationId} for the current conversation.
     */
    public conversationId(): ConversationId {
        const receiver = this.receiver();
        const model = receiver.get();
        switch (model.type) {
            case ReceiverType.CONTACT:
                return {type: ReceiverType.CONTACT, identity: model.view.identity};
            case ReceiverType.GROUP:
                return {
                    type: ReceiverType.GROUP,
                    creatorIdentity: model.view.creatorIdentity,
                    groupId: model.view.groupId,
                };
            case ReceiverType.DISTRIBUTION_LIST:
                // TODO(WEBMD-236): Implement distribution list
                throw new Error('TODO(WEBMD-236): Implement distribution list');
            default:
                return unreachable(model);
        }
    }

    public receiver(): AnyReceiverStore {
        return this.meta.run(() => {
            const receiver = this._receiverLookup;
            switch (receiver.type) {
                case ReceiverType.CONTACT:
                    return contact.getByUid(this._services, receiver.uid, Existence.ENSURED);
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(WEBMD-236): Implement distribution list
                    throw new Error('TODO(WEBMD-236): Implement distribution list');
                case ReceiverType.GROUP:
                    return group.getByUid(this._services, receiver.uid, Existence.ENSURED);
                default:
                    return unreachable(receiver);
            }
        });
    }

    public preview(): IQueryableStore<AnyConversationPreviewMessageView | undefined> {
        return this._lastMessagePreview;
    }

    /** @inheritdoc */
    public update(
        change: Mutable<ConversationUpdate, 'lastUpdate'>,
        unreadMessageCountDelta?: i53,
    ): void {
        this.meta.update((view) => {
            // Prevent 'downgrading' the last update timestamp
            if (
                view.lastUpdate !== undefined &&
                change.lastUpdate !== undefined &&
                view.lastUpdate > change.lastUpdate
            ) {
                change.lastUpdate = view.lastUpdate;
            }

            // Determine unread message count
            const unreadMessageCount =
                unreadMessageCountDelta === undefined
                    ? view.unreadMessageCount
                    : Math.max(view.unreadMessageCount + unreadMessageCountDelta, 0);

            // Commit the change
            update(
                this._services,
                this._receiverLookup,
                ensureExactConversationUpdate(change),
                this.uid,
            );
            return {...change, unreadMessageCount};
        });
    }

    public decrementUnreadMessageCount(): void {
        this.meta.update((view) =>
            // Note: The unread message count is not persisted in the database, so only the view
            //       must be updated!
            ({unreadMessageCount: Math.max(view.unreadMessageCount - 1, 0)}),
        );
    }

    /** @inheritdoc */
    public hasMessage(id: MessageId): boolean {
        return this.meta.run(() =>
            message.isMessagePresentInConversation(this._services, this._handle, id),
        );
    }

    /** @inheritdoc */
    public getMessage(id: MessageId): AnyMessageModelStore | undefined {
        return this.meta.run(() =>
            message.getByMessageId(this._services, this._handle, MESSAGE_FACTORY, id),
        );
    }

    /** @inheritdoc */
    public getAllMessages(): SetOfAnyLocalMessageModelStore {
        return this.meta.run(() => message.all(this._services, this._handle, MESSAGE_FACTORY));
    }

    private _handleRead(source: TriggerSource.LOCAL, readAt: Date): void {
        this.meta.run((handle) => {
            if (handle.view().unreadMessageCount < 1) {
                return;
            }

            handle.update((view) => {
                const {db} = this._services;
                const readMessageIds = db.markConversationAsRead(this.uid, readAt).map((m) => m.id);

                if (readMessageIds.length > 0) {
                    this._updateReadInboundMessageStores(readMessageIds, readAt);
                    this._scheduleReflectMarkMessagesAsRead(readMessageIds, readAt);
                }

                return {unreadMessageCount: 0};
            });
        });
    }

    private _updateReadInboundMessageStores(readMessageIds: MessageId[], readAt: Date): void {
        for (const readMessageId of readMessageIds) {
            const messageModelStore = this.getMessage(readMessageId);
            assert(messageModelStore?.ctx === MessageDirection.INBOUND);
            messageModelStore.get().controller.meta.update(() => ({readAt}));
        }
    }

    private _scheduleReflectMarkMessagesAsRead(readMessageIds: MessageId[], readAt: Date): void {
        // If delivery receipts are enabled and the conversation is a contact conversation,
        // send and reflect a delivery receipt. Otherwise, reflect an IncomingMessageUpdate.
        // TODO(WEBMD-612): Allow disabling delivery receipts
        const deliveryReceiptsDisabled = false;

        if (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            !deliveryReceiptsDisabled &&
            this._receiverLookup.type === ReceiverType.CONTACT
        ) {
            const contactReceiver = this.receiver();
            assert(contactReceiver.type === ReceiverType.CONTACT);

            void this._services.taskManager.schedule(
                new OutgoingDeliveryReceiptTask(
                    this._services,
                    contactReceiver,
                    CspE2eDeliveryReceiptStatus.READ,
                    readAt,
                    readMessageIds,
                ),
            );
        } else {
            const conversation = this.conversationId();

            const messageUniqueIdsToUpdate = readMessageIds.map((messageId) => ({
                messageId,
                conversation,
            }));

            void this._services.taskManager.schedule(
                new ReflectIncomingMessageUpdateTask(
                    this._services,
                    messageUniqueIdsToUpdate,
                    readAt,
                ),
            );
        }
    }

    private async _ensureDirectAcquaintanceLevelForDirectMessages(
        scope:
            | {source: TriggerSource.LOCAL}
            | {source: TriggerSource.REMOTE; handle: InternalActiveTaskCodecHandle},
        receiver: AnyReceiver,
    ): Promise<void> {
        if (receiver.type !== ReceiverType.CONTACT) {
            return;
        }

        if (receiver.view.acquaintanceLevel === AcquaintanceLevel.DIRECT) {
            return;
        }
        this._log.info(
            `Promoting contact from AcquaintanceLevel.GROUP to AcquaintanceLevel.DIRECT: ${receiver.view.identity}`,
        );

        switch (scope.source) {
            case TriggerSource.LOCAL:
                await receiver.controller.update.fromLocal({
                    acquaintanceLevel: AcquaintanceLevel.DIRECT,
                });
                break;
            case TriggerSource.REMOTE:
                await receiver.controller.update.fromRemote(scope.handle, {
                    acquaintanceLevel: AcquaintanceLevel.DIRECT,
                });
                break;

            default:
                unreachable(scope);
        }
    }

    private _addMessage(
        init: DirectedMessageFor<MessageDirection.INBOUND, MessageType, 'init'>,
    ): AnyInboundMessageModelStore;
    private _addMessage(
        init: DirectedMessageFor<MessageDirection.OUTBOUND, MessageType, 'init'>,
    ): AnyOutboundMessageModelStore;
    private _addMessage(
        init: DirectedMessageFor<MessageDirection, MessageType, 'init'>,
    ): AnyMessageModelStore;
    private _addMessage(
        init: DirectedMessageFor<MessageDirection, MessageType, 'init'>,
    ): AnyMessageModelStore {
        const isInbound = init.direction === MessageDirection.INBOUND;
        const isUnread = init.readAt === undefined;

        // Update 'last update' date and unread count
        const lastUpdate = isInbound ? init.receivedAt : init.createdAt;
        const unreadMessageCountDelta = isInbound && isUnread ? 1 : 0;
        this.update({lastUpdate}, unreadMessageCountDelta);

        // Store the message in the DB and retrieve the model
        const store = message.create(this._services, this._handle, MESSAGE_FACTORY, init);

        // Update 'last message', if applicable
        // TODO(WEBMD-296): This needs to depend on whether the message appears as the last message
        //                  (i.e. the sort order)!
        this._updateLastMessagePreview();

        // Ensure that the contracts stated by the overload variants of this function are fulfilled
        switch (init.direction) {
            case MessageDirection.INBOUND:
                assert(
                    store.ctx === MessageDirection.INBOUND,
                    'An init param for an inbound message should create an inbound message',
                );
                break;

            case MessageDirection.OUTBOUND:
                assert(
                    store.ctx === MessageDirection.OUTBOUND,
                    'An init param for an outbound message should create an outbound message',
                );
                break;

            default:
                unreachable(init);
        }

        return store;
    }

    private _updateLastMessagePreview(): void {
        const lastMessage = message.getLastMessage(this._services, this._handle, MESSAGE_FACTORY);
        this._lastMessagePreview.replace(lastMessage === undefined ? [] : [lastMessage]);
    }
}

/**
 * Return a log tag for the specified receiver.
 * This should only be used for debugging purposes.
 */
// eslint-disable-next-line consistent-return
function getDebugTagForReceiver(
    db: DatabaseBackend,
    receiver: DbReceiverLookup,
): string | undefined {
    if (!import.meta.env.DEBUG) {
        return undefined;
    }
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return db.getContactByUid(receiver.uid)?.identity;
        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(WEBMD-236): Implement distribution list
            throw new Error('TODO(WEBMD-236): Implement distribution list');
        case ReceiverType.GROUP: {
            const groupReceiver = db.getGroupByUid(receiver.uid);
            if (groupReceiver !== undefined) {
                return getGroupTag(groupReceiver.creatorIdentity, groupReceiver.groupId);
            }
            return undefined;
        }
        default:
            unreachable(receiver);
    }
}

function all(services: ServicesForModel): LocalSetStore<LocalModelStore<Conversation>> {
    // Note: This may be inefficient. It would be more efficient to get all UIDs, then filter
    // out all UIDs we have cached stores for and then make an aggregated request for the
    // remaining ones.
    return cache.set.derefOrCreate(() => {
        const {db, logging} = services;
        const stores = db.getAllConversationReceivers().map(({receiver}) => {
            const tag = getDebugTagForReceiver(db, receiver);
            return getByReceiver(services, receiver, Existence.ENSURED, tag);
        });
        const tag = `conversation[]`;
        return new LocalSetStore(new Set(stores), {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    });
}

export class ConversationModelStore extends LocalModelStore<Conversation> {
    public constructor(
        services: ServicesForModel,
        receiverLookup: DbReceiverLookup,
        conversation: ConversationView,
        uid: DbConversationUid,
        tag: string,
    ) {
        const {logging} = services;
        tag = `conversation.${tag}`;
        super(
            conversation,
            new ConversationModelController(services, receiverLookup, uid, tag),
            uid,
            undefined,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

/** @inheritdoc */
export class ConversationModelRepository implements ConversationRepository {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly totalUnreadMessageCount: ISubscribableStore<u53>;

    public constructor(private readonly _services: ServicesForModel) {
        this.totalUnreadMessageCount = derive(this.getAll(), (conversations, getAndSubscribe) => {
            let totalCount = 0;
            for (const conversation of conversations) {
                totalCount += getAndSubscribe(conversation).view.unreadMessageCount;
            }
            return totalCount;
        });
    }

    /** @inheritdoc */
    public getForReceiver(receiver: DbReceiverLookup): LocalModelStore<Conversation> | undefined {
        const tag = getDebugTagForReceiver(this._services.db, receiver);
        return getByReceiver(this._services, receiver, Existence.UNKNOWN, tag);
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<LocalModelStore<Conversation>> {
        return all(this._services);
    }
}
