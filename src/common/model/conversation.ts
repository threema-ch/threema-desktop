import type {DbConversationUid, DbReceiverLookup, UidOf} from '~/common/db';
import {
    AcquaintanceLevel,
    ConversationVisibility,
    CspE2eDeliveryReceiptStatus,
    Existence,
    MessageDirection,
    MessageQueryDirection,
    MessageType,
    ReadReceiptPolicy,
    ReceiverType,
    TriggerSource,
    TypingIndicatorPolicy,
    type StatusMessageType,
} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    Conversation,
    ConversationController,
    ConversationControllerHandle,
    ConversationRepository,
    ConversationUpdate,
    ConversationUpdateFromToSync,
    ConversationView,
} from '~/common/model/types/conversation';
import type {
    AnyDeletedMessageModelStore,
    AnyInboundNonDeletedMessageModelStore,
    AnyMessageModelStore,
    AnyNonDeletedMessageModelStore,
    AnyNonDeletedMessageType,
    AnyOutboundNonDeletedMessageModelStore,
    DirectedMessageFor,
    SetOfAnyLocalMessageModelStore,
} from '~/common/model/types/message';
import type {
    InboundDeletedMessageModel,
    OutboundDeletedMessageModel,
} from '~/common/model/types/message/deleted';
import type {AnyReceiver, AnyReceiverStore} from '~/common/model/types/receiver';
import type {
    AnyStatusMessageModelStore,
    StatusMessageModelStores,
    StatusMessageView,
} from '~/common/model/types/status';
import {getDebugTagForReceiver} from '~/common/model/utils/debug-tags';
import {LazyWeakRef, ModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {InternalActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingConversationMessageTask} from '~/common/network/protocol/task/csp/outgoing-conversation-message';
import {OutgoingDeleteMessageTask} from '~/common/network/protocol/task/csp/outgoing-delete-message';
import {OutgoingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/outgoing-delivery-receipt';
import {OutgoingTypingIndicatorTask} from '~/common/network/protocol/task/csp/outgoing-typing-indicator';
import {ReflectContactSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-contact-sync-transaction';
import {ReflectGroupSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-group-sync-transaction';
import {ReflectIncomingMessageUpdateTask} from '~/common/network/protocol/task/d2d/reflect-message-update';
import {
    isMessageId,
    type ConversationId,
    type MessageId,
    type StatusMessageId,
    isStatusMessageId,
    statusMessageIdtoStatusMessageUid,
} from '~/common/network/types';
import type {i53, Mutable, u53} from '~/common/types';
import {assert, assertUnreachable, isNotUndefined, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {
    createExactPropertyValidator,
    type Exact,
    OPTIONAL,
} from '~/common/utils/property-validator';
import {type LocalStore, WritableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalSetStore, type IDerivableSetStore} from '~/common/utils/store/set-store';
import {TIMER, type TimerCanceller} from '~/common/utils/timer';

import * as contact from './contact';
import * as group from './group';
import * as message from './message';
import {MESSAGE_FACTORY} from './message/factory';
import * as status from './status';

// TODO(DESK-697)
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createCache() {
    const set = new LazyWeakRef<LocalSetStore<ModelStore<Conversation>>>();
    return {
        set,
        store: {
            [ReceiverType.CONTACT]: new ModelStoreCache<
                UidOf<DbReceiverLookup>,
                ModelStore<Conversation>
            >(set),
            [ReceiverType.DISTRIBUTION_LIST]: new ModelStoreCache<
                UidOf<DbReceiverLookup>,
                ModelStore<Conversation>
            >(set),
            [ReceiverType.GROUP]: new ModelStoreCache<
                UidOf<DbReceiverLookup>,
                ModelStore<Conversation>
            >(set),
        } as const,
    } as const;
}

let cache = createCache();

function recreateCaches(): void {
    cache = createCache();
}

const ensureExactConversationUpdate = createExactPropertyValidator<ConversationUpdate>(
    'ConversationUpdate',
    {
        lastUpdate: OPTIONAL,
        category: OPTIONAL,
        visibility: OPTIONAL,
        isTyping: OPTIONAL,
    },
);

export function deactivateAndPurgeCacheCascade(
    receiver: DbReceiverLookup,
    conversation: ModelStore<Conversation>,
): void {
    const {controller} = conversation.get();

    // Deactivate the conversation...
    controller.meta.deactivate(() => {
        // Deactivate and purge all currently cached messages of this conversation
        message.deactivateAndPurgeCache(controller.uid);

        // Deactivate and purge all currently cached status messages of this conversation
        status.deactivateAndPurgeCache(controller.uid);

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
    ? ModelStore<Conversation>
    : ModelStore<Conversation> | undefined;

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
): ModelStore<Conversation> | undefined {
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

/**
 * Fetch a conversation model by its `uid`.
 */
export function getByUid(
    services: ServicesForModel,
    uid: DbConversationUid,
    existence: Existence,
    tag?: string,
): ModelStore<Conversation> | undefined {
    const {db} = services;

    const conversation = db.getConversationByUid(uid);
    const receiver = conversation?.receiver;
    if (existence === Existence.ENSURED) {
        assert(receiver !== undefined, `Expected conversation ${uid} to exist`);
    } else if (receiver === undefined) {
        return undefined;
    }

    return getByReceiver(services, receiver, existence, tag);
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
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<ConversationView>();

    public readonly read = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (readAt: Date) => this._handleRead(TriggerSource.LOCAL, readAt),
    };

    /** @inheritdoc */
    public readonly addMessage: ConversationController['addMessage'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (
            init: DirectedMessageFor<MessageDirection.OUTBOUND, AnyNonDeletedMessageType, 'init'>,
        ) => {
            const receiverStore = this.receiver();
            const receiver = receiverStore.get();

            await this._ensureDirectAcquaintanceLevelForDirectMessages(
                {source: TriggerSource.LOCAL},
                receiver,
            );

            await this._ensureConversationIsUnarchived({source: TriggerSource.LOCAL});

            const messageStore = this._addMessage(init);

            // Trigger task if this message was created locally
            const {taskManager} = this._services;
            taskManager
                .schedule(
                    new OutgoingConversationMessageTask(this._services, receiver, messageStore),
                )
                .catch(() => {
                    // Ignore (task should persist)
                });

            // Return the added message
            return messageStore;
        },
        fromSync: (init: DirectedMessageFor<MessageDirection, AnyNonDeletedMessageType, 'init'>) =>
            this._addMessage(init),
        fromRemote: async (
            activeTaskHandle,
            init: DirectedMessageFor<MessageDirection.INBOUND, AnyNonDeletedMessageType, 'init'>,
        ) => {
            const receiver = this.receiver();

            await this._ensureDirectAcquaintanceLevelForDirectMessages(
                {source: TriggerSource.REMOTE, handle: activeTaskHandle},
                receiver.get(),
            );

            await this._ensureConversationIsUnarchived({
                source: TriggerSource.REMOTE,
                handle: activeTaskHandle,
            });

            const store = this._addMessage(init);

            // Trigger a notification
            this.meta.run((handle) => {
                // TODO(DESK-255): This must be delayed to prevent notifications for messages that have
                // already been acknowledged or which are going to be acknowledged by another device within
                // a small time period.
                this._services.notification
                    .notifyNewMessage(store, {
                        receiver,
                        view: handle.view(),
                    })
                    .catch(assertUnreachable);
            });

            // Return the added message
            return store;
        },
    };

    /** @inheritdoc */
    public readonly removeMessage: ConversationController['removeMessage'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (uid: MessageId) => {
            const messageToRemove = this.getMessage(uid);

            if (messageToRemove === undefined) {
                return;
            }

            messageToRemove.get().controller.remove();
            this._updateStoresOnConversationUpdate();
        },
    };

    /** @inheritdoc */
    public readonly markMessageAsDeleted: ConversationController['markMessageAsDeleted'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (uid: MessageId, deletedAt: Date) => {
            const messageToDelete = this.getMessage(uid);
            if (messageToDelete === undefined) {
                this._log.warn('Cannot find the message to be deleted');
                return;
            }

            await this._lock.with(async () => {
                // Validate message
                if (messageToDelete.type === MessageType.DELETED) {
                    this._log.warn('Trying to delete a message that was already deleted.');
                    return;
                }
                if (!messageToDelete.get().controller.meta.active.get()) {
                    this._log.warn('Trying to delete a message with an inactive model.');
                    return;
                }
                assert(
                    messageToDelete.ctx === MessageDirection.OUTBOUND,
                    'Cannot send an outgoing delete message task for an inbound message',
                );

                // Run task
                const task = new OutgoingDeleteMessageTask(
                    this._services,
                    this.receiver().get(),
                    messageToDelete,
                    deletedAt,
                );
                await this._services.taskManager.schedule(task);

                // Update local state
                this._deleteMessage(messageToDelete, deletedAt);
                this._updateStoresOnConversationUpdate();
            });
        },

        fromSync: (uid: MessageId, deletedAt: Date) => {
            const messageToDelete = this.getMessage(uid);

            // Validate message
            if (messageToDelete === undefined) {
                this._log.warn('Cannot find the message to be deleted');
                return;
            }
            if (messageToDelete.type === MessageType.DELETED) {
                this._log.warn('Trying to delete a message that was already deleted.');
                return;
            }
            if (!messageToDelete.get().controller.meta.active.get()) {
                this._log.warn('Trying to delete a message with an inactive model.');
                return;
            }

            // Update local state
            this._deleteMessage(messageToDelete, deletedAt);
            this._updateStoresOnConversationUpdate();
        },

        fromRemote: async (handle, uid: MessageId, deletedAt: Date) => {
            const messageToDelete = this.getMessage(uid);
            if (messageToDelete === undefined) {
                this._log.warn('Cannot find the message to be deleted');
                return;
            }

            // eslint-disable-next-line @typescript-eslint/require-await
            await this._lock.with(async () => {
                // Validate message
                if (messageToDelete.type === MessageType.DELETED) {
                    this._log.warn('Trying to delete a message that was already deleted.');
                    return;
                }
                if (!messageToDelete.get().controller.meta.active.get()) {
                    this._log.warn('Trying to delete a message with an inactive model.');
                    return;
                }

                // Update local state
                const deletedMessageStore = this._deleteMessage(messageToDelete, deletedAt);
                this._updateStoresOnConversationUpdate();

                // Update notification
                assert(
                    deletedMessageStore.ctx === MessageDirection.INBOUND,
                    'Cannot create a delete notification for an outbound message',
                );
                this.meta.run((storeHandle): void => {
                    this._services.notification
                        .notifyMessageDelete(deletedMessageStore, {
                            receiver: this.receiver(),
                            view: storeHandle.view(),
                        })
                        .catch(assertUnreachable);
                });
            });
        },
    };

    /** @inheritdoc */
    public readonly removeAllMessages: ConversationController['removeAllMessages'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async () => {
            this.meta.update(() => {
                message.removeAll(this._services, this._log, this.uid);
                this._updateStoresOnConversationUpdate();
                return {};
            });
        },
    };

    /** @inheritdoc */
    public readonly removeStatusMessage: ConversationController['removeStatusMessage'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (statusMessageId: StatusMessageId) => {
            this.meta.update(() => {
                status.remove(
                    this._services,
                    this._log,
                    this.uid,
                    statusMessageIdtoStatusMessageUid(statusMessageId),
                );
                this._updateStatusStoresOnConversationUpdate();
                return {};
            });
        },
    };

    /** @inheritdoc */
    public readonly removeAllStatusMessages: ConversationController['removeAllStatusMessages'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async () => {
            this.meta.update(() => {
                status.removeAllOfConversation(this._services, this._log, this.uid);
                this._updateStatusStoresOnConversationUpdate();
                return {};
            });
        },
    };

    /** @inheritdoc */
    public readonly update: ConversationController['update'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (
            change: Mutable<ConversationUpdate, 'lastUpdate'>,
            unreadMessageCountDelta?: i53,
        ): void => {
            this.meta.update((view) => this._update(view, change, unreadMessageCountDelta));
        },
    };

    public readonly updateVisibility: ConversationController['updateVisibility'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (
            visibility: ConversationVisibility,
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => {
            const conversationChange: ConversationUpdateFromToSync = {visibility};

            // No need for a precondition to archive or pin
            const precondition = (): boolean => this.meta.active.get();

            let syncTask: ReflectContactSyncTransactionTask | ReflectGroupSyncTransactionTask;

            const conversationId = this.conversationId();
            switch (conversationId.type) {
                case ReceiverType.CONTACT:
                    syncTask = new ReflectContactSyncTransactionTask(this._services, precondition, {
                        type: 'update-conversation-data',
                        identity: conversationId.identity,
                        conversation: conversationChange,
                    });
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-236): Implement distribution list
                    throw new Error('TODO(DESK-236): Implement distribution list');
                case ReceiverType.GROUP:
                    syncTask = new ReflectGroupSyncTransactionTask(this._services, precondition, {
                        type: 'update',
                        groupId: conversationId.groupId,
                        creatorIdentity: conversationId.creatorIdentity,
                        group: {},
                        conversation: conversationChange,
                    });
                    break;
                default:
                    unreachable(conversationId);
            }

            await this._lock.with(async () => {
                const result = await this._services.taskManager.schedule(syncTask);
                // Commit update, if possible
                switch (result) {
                    case 'success':
                        // Update locally
                        this.meta.update((view) => this._update(view, {visibility}));
                        break;
                    case 'aborted':
                        // Synchronization conflict
                        throw new Error(
                            'Failed to update conversation visibility due to synchronization conflict',
                        );
                    default:
                        unreachable(result);
                }
            });
        },
    };

    public readonly updateTyping: ConversationController['updateTyping'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, isTyping: boolean) => {
            this._updateIsTyping(isTyping);
        },

        fromSync: (isTyping) => {
            this._updateIsTyping(isTyping);
        },

        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (isTyping: boolean) => {
            if (this._shouldSendTypingIndicator()) {
                if (isTyping) {
                    this._resetIsTypingOutgoingTimer();
                    if (this._isTypingOutgoingTimerCanceller === undefined) {
                        this._scheduleOutgoingTypingIndicatorTask(true);
                        this._isTypingOutgoingTimerCanceller = TIMER.repeat(
                            () => this._scheduleOutgoingTypingIndicatorTask(true),
                            this._isTypingOutgoingInterval,
                            'after-interval',
                        );
                    }
                } else {
                    this._scheduleOutgoingTypingIndicatorTask(false);
                    this._isTypingOutgoingTimerCanceller?.();
                    this._isTypingOutgoingTimerCanceller = undefined;
                }
            }
        },
    };

    private readonly _isTypingIncomingTimeout = 15000;
    private readonly _isTypingOutgoingInterval = 10000;
    private readonly _isTypingOutgoingTimeout = 5000;

    private readonly _resetIsTypingOutgoingTimer = TIMER.debounce(() => {
        if (this._isTypingOutgoingTimerCanceller !== undefined) {
            this._scheduleOutgoingTypingIndicatorTask(false);
            this._isTypingOutgoingTimerCanceller();
            this._isTypingOutgoingTimerCanceller = undefined;
        }
    }, this._isTypingOutgoingTimeout);

    private readonly _handle: ConversationControllerHandle;
    private readonly _lock = new AsyncLock();
    private readonly _log: Logger;

    // Stores
    private readonly _lastMessageStore: WritableStore<AnyMessageModelStore | undefined>;
    private readonly _lastStatusMessageStore: WritableStore<AnyStatusMessageModelStore | undefined>;
    // This store is used to notify subscribers that the conversation was updated and potentially
    // stale data should be refreshed. This is e.g. used for subscribers to react to added or
    // removed messages.
    private readonly _lastModificationStore: WritableStore<Date>;

    private _isTypingIncomingTimerCanceller: TimerCanceller | undefined;
    private _isTypingOutgoingTimerCanceller: TimerCanceller | undefined;

    public constructor(
        private readonly _services: ServicesForModel,
        public readonly receiverLookup: DbReceiverLookup,
        public readonly uid: DbConversationUid,
        tag: string,
    ) {
        tag = `model.${tag}`;
        this._log = this._services.logging.logger(tag);
        this._handle = {
            uid,
            receiverLookup,
            conversationId: this.conversationId.bind(this),
            decrementUnreadMessageCount: this.decrementUnreadMessageCount.bind(this),
            getReceiver: this.receiver.bind(this),
        };

        this._lastMessageStore = new WritableStore(
            message.getLastMessage(_services, this._handle, MESSAGE_FACTORY),
        );

        this._lastStatusMessageStore = new WritableStore(
            status.getLastStatusMessage(_services, this._handle),
        );

        this._lastModificationStore = new WritableStore(new Date());
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
            case ReceiverType.GROUP: {
                return {
                    type: ReceiverType.GROUP,
                    creatorIdentity: contact.getIdentityString(
                        this._services.device,
                        model.view.creator,
                    ),
                    groupId: model.view.groupId,
                };
            }
            case ReceiverType.DISTRIBUTION_LIST:
                // TODO(DESK-236): Implement distribution list
                throw new Error('TODO(DESK-236): Implement distribution list');
            default:
                return unreachable(model);
        }
    }

    public receiver(): AnyReceiverStore {
        return this.meta.run(() => {
            const receiver = this.receiverLookup;
            switch (receiver.type) {
                case ReceiverType.CONTACT:
                    return contact.getByUid(this._services, receiver.uid, Existence.ENSURED);
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-236): Implement distribution list
                    throw new Error('TODO(DESK-236): Implement distribution list');
                case ReceiverType.GROUP:
                    return group.getByUid(this._services, receiver.uid, Existence.ENSURED);
                default:
                    return unreachable(receiver);
            }
        });
    }

    /** @inheritdoc */
    public lastMessageStore(): LocalStore<AnyMessageModelStore | undefined> {
        return this._lastMessageStore;
    }

    /** @inheritdoc */
    public lastStatusMessageStore(): LocalStore<AnyStatusMessageModelStore | undefined> {
        return this._lastStatusMessageStore;
    }

    /** @inheritdoc */
    public lastModificationStore(): LocalStore<Date> {
        return this._lastModificationStore;
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

    /** @inheritdoc */
    public getMessagesWithSurroundingMessages(
        anyMessageIds: ReadonlySet<MessageId | StatusMessageId>,
        contextSize: u53,
    ): Set<AnyMessageModelStore | AnyStatusMessageModelStore> {
        const {db} = this._services;

        return this.meta.run(() => {
            // If the viewport is empty, do nothing
            if (anyMessageIds.size === 0) {
                return new Set();
            }

            const perMessageTypeContextSize = Math.round(contextSize / 2);

            // Get all visible messages and their ordinals.
            const spreadMessageIds = [...anyMessageIds];
            const visibleMessages = spreadMessageIds
                .filter(isMessageId)
                .map((messageId) =>
                    message.getByMessageId(
                        this._services,
                        this._handle,
                        MESSAGE_FACTORY,
                        messageId,
                    ),
                )
                .filter(isNotUndefined);
            const standardMessageOrdinals = visibleMessages.map((m) => m.get().view.ordinal);

            // Get all visible stauts messages and their ordinals.
            const visibileStatusMessages = spreadMessageIds
                .filter(isStatusMessageId)
                .map((statusMessageId) =>
                    status.checkExistenceAndGetByUid(
                        this._services,
                        this._handle,
                        statusMessageIdtoStatusMessageUid(statusMessageId),
                    ),
                )
                .filter(isNotUndefined);
            const statusMessageOrdinals = visibileStatusMessages.map((s) => s.get().view.ordinal);

            // This is the very special case that the messages where already deleted but the viewport re-derive triggers again.
            if (standardMessageOrdinals.length === 0 && statusMessageOrdinals.length === 0) {
                return new Set();
            }

            // Calculate the min (max) ordinals of all (status) messages in the current viewport.
            const minOrdinal = Math.min(
                Math.min(...standardMessageOrdinals),
                Math.min(...statusMessageOrdinals),
            );
            const maxOrdinal = Math.max(
                Math.max(...standardMessageOrdinals),
                Math.max(...statusMessageOrdinals),
            );

            // Fetch all messages in the current viewport context.
            const oldestMessages = db
                .getMessageUids(this.uid, perMessageTypeContextSize, {
                    ordinal: minOrdinal,
                    direction: MessageQueryDirection.OLDER,
                })
                .map((m) =>
                    message.getByUid(
                        this._services,
                        this._handle,
                        MESSAGE_FACTORY,
                        m.uid,
                        Existence.ENSURED,
                    ),
                );

            const newestMessages = db
                .getMessageUids(this.uid, perMessageTypeContextSize, {
                    ordinal: maxOrdinal,
                    direction: MessageQueryDirection.NEWER,
                })
                .map((m) =>
                    message.getByUid(
                        this._services,
                        this._handle,
                        MESSAGE_FACTORY,
                        m.uid,
                        Existence.ENSURED,
                    ),
                );

            // Fetch all status messages in the current viewport context.
            const oldestStatusMessages = db
                .getStatusMessageUids(this.uid, perMessageTypeContextSize, {
                    ordinal: minOrdinal,
                    direction: MessageQueryDirection.OLDER,
                })
                .map((s) =>
                    status.getByUid(this._services, this._handle, s.uid, Existence.ENSURED),
                );

            const newestStatusMessages = db
                .getStatusMessageUids(this.uid, perMessageTypeContextSize, {
                    ordinal: maxOrdinal,
                    direction: MessageQueryDirection.NEWER,
                })
                .map((s) =>
                    status.getByUid(this._services, this._handle, s.uid, Existence.ENSURED),
                );

            // Return the mixed fetched set of status and standard messages in the current viewport context
            return new Set([
                ...oldestMessages,
                ...oldestStatusMessages,
                ...visibleMessages,
                ...visibileStatusMessages,
                ...newestMessages,
                ...newestStatusMessages,
            ]);
        });
    }

    /** @inheritdoc */
    public getAllStatusMessages(): IDerivableSetStore<AnyStatusMessageModelStore> {
        return this.meta.run(() =>
            status.allStatusMessagesOfConversation(this._services, this._handle),
        );
    }

    /** @inheritdoc */
    public getMessageCount(): u53 {
        return (
            message.getConversationMessageCount(this._services, this._handle) +
            status.getConversationStatusMessageCount(this._services, this._handle)
        );
    }

    /** @inheritdoc */
    public getFirstUnreadMessageId(): MessageId | undefined {
        return message.getFirstUnreadMessageId(this._services, this._handle);
    }

    /** @inheritdoc */
    public createStatusMessage<TType extends StatusMessageType>(
        statusMessage: Omit<StatusMessageView<TType>, 'conversationUid' | 'id' | 'ordinal'>,
    ): StatusMessageModelStores[TType] {
        const statusMessageModelStore = status.createStatusMessage(this._services, {
            ...statusMessage,
            conversationUid: this.uid,
        });
        this._updateStatusStoresOnConversationUpdate();

        return statusMessageModelStore;
    }

    /**
     * Update `isTyping` in the associated {@link ConversationView}, and schedule a timeout to
     * change it back to `false` if this method isn't called again in the given timeframe.
     */
    private _updateIsTyping(isTyping: boolean): void {
        // (Re-)schedule timer if `isTyping === true`.
        if (isTyping) {
            this._isTypingIncomingTimerCanceller?.();
            this._isTypingIncomingTimerCanceller = TIMER.timeout(() => {
                this.meta.update((view) => this._update(view, {isTyping: false}));
                this._isTypingIncomingTimerCanceller = undefined;
            }, this._isTypingIncomingTimeout);
        } else {
            this._isTypingIncomingTimerCanceller?.();
        }

        this.meta.update((view) => this._update(view, {isTyping}));
    }

    /**
     * Locally mark a message as deleted.
     */
    private _deleteMessage(
        messageToDelete: AnyNonDeletedMessageModelStore,
        deletedAt: Date,
    ): AnyDeletedMessageModelStore {
        return message.markMessageAsDeleted(
            this._services,
            deletedAt,
            this._handle,
            messageToDelete,
            MESSAGE_FACTORY,
            this._log,
        );
    }

    /**
     * Update database with the change, determine derived view data and return the view update.
     */
    private _update(
        view: Readonly<ConversationView>,
        change: Mutable<ConversationUpdate, 'lastUpdate'>,
        unreadMessageCountDelta?: i53,
    ): Partial<ConversationView> {
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

        update(
            this._services,
            this.receiverLookup,
            ensureExactConversationUpdate(change),
            this.uid,
        );

        return {...change, unreadMessageCount};
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
                    this._markMessagesAsRead(readMessageIds, readAt);
                    if (this._shouldSendReadReceipt()) {
                        this._sendReadReceiptsToContact(readMessageIds, readAt);
                    } else {
                        this._reflectMarkMessagesAsRead(readMessageIds, readAt);
                    }
                }

                return {unreadMessageCount: 0};
            });
        });
    }

    private _markMessagesAsRead(readMessageIds: MessageId[], readAt: Date): void {
        for (const readMessageId of readMessageIds) {
            const messageModelStore = this.getMessage(readMessageId);
            assert(messageModelStore?.ctx === MessageDirection.INBOUND);
            messageModelStore.get().controller.meta.update(() => ({readAt}));
        }
    }

    /**
     * Read receipts have to be sent and reflected only for contact conversations following the
     * read receipt policy override for the contact if defined, or following the global read receipt
     * policy otherwise. Note that if no delivery receipt is sent, an {@link IncomingMessageUpdate}
     * has to be sent instead.
     */
    private _shouldSendReadReceipt(): boolean {
        if (this.receiverLookup.type !== ReceiverType.CONTACT) {
            return false;
        }

        // Check contact read receipt policy override
        const contactReceiver = this.receiver();
        assert(contactReceiver.type === ReceiverType.CONTACT);
        const {readReceiptPolicyOverride} = contactReceiver.get().view;
        if (readReceiptPolicyOverride !== undefined) {
            return readReceiptPolicyOverride === ReadReceiptPolicy.SEND_READ_RECEIPT;
        }

        // Otherwise, fall back to global default
        const {readReceiptPolicy} = this._services.model.user.privacySettings.get().view;
        return readReceiptPolicy !== ReadReceiptPolicy.DONT_SEND_READ_RECEIPT;
    }

    /**
     * Note that since this method schedules a {@link OutgoingDeliveryReceiptTask} the read status
     * will also be synced with the linked devices without having to manually schedule a
     * {@link ReflectIncomingMessageUpdateTask}.
     */
    private _sendReadReceiptsToContact(readMessageIds: MessageId[], readAt: Date): void {
        const contactReceiver = this.receiver();
        assert(contactReceiver.type === ReceiverType.CONTACT);

        this._services.taskManager
            .schedule(
                new OutgoingDeliveryReceiptTask(
                    this._services,
                    contactReceiver.get(),
                    CspE2eDeliveryReceiptStatus.READ,
                    readAt,
                    readMessageIds,
                ),
            )
            .catch(() => {
                // Ignore (task should persist)
            });
    }

    private _reflectMarkMessagesAsRead(readMessageIds: MessageId[], readAt: Date): void {
        const conversation = this.conversationId();

        const messageUniqueIdsToUpdate = readMessageIds.map((messageId) => ({
            messageId,
            conversation,
        }));

        this._services.taskManager
            .schedule(
                new ReflectIncomingMessageUpdateTask(
                    this._services,
                    messageUniqueIdsToUpdate,
                    readAt,
                ),
            )
            .catch(() => {
                // Ignore (task should persist)
            });
    }

    private _shouldSendTypingIndicator(): boolean {
        if (this.receiverLookup.type !== ReceiverType.CONTACT) {
            return false;
        }

        // Check contact typing indicator policy override
        const contactReceiver = this.receiver();
        assert(contactReceiver.type === ReceiverType.CONTACT);
        const {typingIndicatorPolicyOverride} = contactReceiver.get().view;
        if (typingIndicatorPolicyOverride !== undefined) {
            return typingIndicatorPolicyOverride === TypingIndicatorPolicy.SEND_TYPING_INDICATOR;
        }

        // Otherwise, fall back to global default
        const {typingIndicatorPolicy} = this._services.model.user.privacySettings.get().view;
        return typingIndicatorPolicy !== TypingIndicatorPolicy.DONT_SEND_TYPING_INDICATOR;
    }

    private _scheduleOutgoingTypingIndicatorTask(isTyping: boolean): void {
        const contactReceiver = this.receiver();
        assert(contactReceiver.type === ReceiverType.CONTACT);
        this._services.taskManager
            .schedule(
                new OutgoingTypingIndicatorTask(this._services, contactReceiver.get(), isTyping),
            )
            .catch(() => {
                // Ignore (task should persist)
            });
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

    private async _ensureConversationIsUnarchived(
        scope:
            | {source: TriggerSource.LOCAL}
            | {source: TriggerSource.REMOTE; handle: InternalActiveTaskCodecHandle},
    ): Promise<void> {
        await this.meta.run(async (conversation) => {
            if (conversation.view().visibility !== ConversationVisibility.ARCHIVED) {
                return;
            }

            this._log.info('Unarchiving conversation');

            const conversationChange: ConversationUpdateFromToSync = {
                visibility: ConversationVisibility.SHOW,
            };

            // Precondition: The conversation is archived
            const precondition = (): boolean =>
                this.meta.active.get() &&
                conversation.view().visibility === ConversationVisibility.ARCHIVED;

            let syncTask: ReflectContactSyncTransactionTask | ReflectGroupSyncTransactionTask;

            const conversationId = this.conversationId();
            switch (conversationId.type) {
                case ReceiverType.CONTACT:
                    syncTask = new ReflectContactSyncTransactionTask(this._services, precondition, {
                        type: 'update-conversation-data',
                        identity: conversationId.identity,
                        conversation: conversationChange,
                    });
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-236): Implement distribution list
                    throw new Error('TODO(DESK-236): Implement distribution list');
                case ReceiverType.GROUP:
                    syncTask = new ReflectGroupSyncTransactionTask(this._services, precondition, {
                        type: 'update',
                        groupId: conversationId.groupId,
                        creatorIdentity: conversationId.creatorIdentity,
                        group: {},
                        conversation: conversationChange,
                    });
                    break;
                default:
                    unreachable(conversationId);
            }

            await this._lock.with(async () => {
                let result;
                switch (scope.source) {
                    case TriggerSource.LOCAL:
                        result = await this._services.taskManager.schedule(syncTask);
                        break;
                    case TriggerSource.REMOTE:
                        result = await syncTask.run(scope.handle);
                        break;
                    default:
                        unreachable(scope);
                }

                // Commit update, if possible
                switch (result) {
                    case 'success':
                        // Update locally
                        this.meta.update((view) => this._update(view, conversationChange));
                        break;
                    case 'aborted':
                        // Synchronization conflict
                        throw new Error('Failed to update contact due to synchronization conflict');
                    default:
                        unreachable(result);
                }
            });
        });
    }

    private _addMessage(
        init: DirectedMessageFor<MessageDirection.INBOUND, AnyNonDeletedMessageType, 'init'>,
    ): Exclude<AnyInboundNonDeletedMessageModelStore, InboundDeletedMessageModel>;
    private _addMessage(
        init: DirectedMessageFor<MessageDirection.OUTBOUND, AnyNonDeletedMessageType, 'init'>,
    ): Exclude<AnyOutboundNonDeletedMessageModelStore, OutboundDeletedMessageModel>;
    private _addMessage(
        init: DirectedMessageFor<MessageDirection, AnyNonDeletedMessageType, 'init'>,
    ): AnyNonDeletedMessageModelStore;
    private _addMessage(
        init: DirectedMessageFor<MessageDirection, AnyNonDeletedMessageType, 'init'>,
    ): AnyNonDeletedMessageModelStore {
        const isInbound = init.direction === MessageDirection.INBOUND;
        const isUnread = init.readAt === undefined;

        // Update 'last update' date and unread count
        const lastUpdate = isInbound ? init.receivedAt : init.createdAt;
        const unreadMessageCountDelta = isInbound && isUnread ? 1 : 0;
        this.update.fromSync({lastUpdate}, unreadMessageCountDelta);

        // Store the message in the DB and retrieve the model
        const store = message.create(this._services, this._handle, MESSAGE_FACTORY, init);

        assert(store.type !== MessageType.DELETED, 'Cannot directly add a deleted message');

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

        // Update dependent stores
        this._updateStoresOnConversationUpdate();

        return store;
    }

    /**
     * Update the stores that depend on conversation changes:
     *
     * - Update {@link _lastMessageStore} with the last message of the conversation.
     * - Update {@link _lastModificationStore} with the current timestamp.
     */
    private _updateStoresOnConversationUpdate(): void {
        // Note: Update the "last message" store before updating the "last conversation update"
        // store. This way, when subscribing to conversation updates, the last message can be
        // fetched from the "last message" store and will already be correct.
        this._lastMessageStore.set(
            message.getLastMessage(this._services, this._handle, MESSAGE_FACTORY),
        );
        this._lastModificationStore.set(new Date());
    }

    private _updateStatusStoresOnConversationUpdate(): void {
        // Note: Update the "last status message" store before updating the "last conversation update"
        // store. This way, when subscribing to conversation updates, the last message can be
        // fetched from the "last message" store and will already be correct.
        this._lastStatusMessageStore.set(status.getLastStatusMessage(this._services, this._handle));
        this._lastModificationStore.set(new Date());
    }
}

function all(services: ServicesForModel): LocalSetStore<ModelStore<Conversation>> {
    // Note: This may be inefficient. It would be more efficient to get all UIDs, then filter
    // out all UIDs we have cached stores for and then make an aggregated request for the
    // remaining ones.
    return cache.set.derefOrCreate(() => {
        const {db, logging} = services;
        const stores = db.getAllConversationReceivers().map(({receiver}) => {
            const tag = getDebugTagForReceiver(receiver);
            return getByReceiver(services, receiver, Existence.ENSURED, tag);
        });
        const tag = 'conversation[]';
        return new LocalSetStore(new Set(stores), {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    });
}

export class ConversationModelStore extends ModelStore<Conversation> {
    public constructor(
        services: ServicesForModel,
        receiverLookup: DbReceiverLookup,
        conversation: ConversationView,
        uid: DbConversationUid,
        tag: string,
    ) {
        const {logging} = services;
        tag = `${tag}.conversation`;
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
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly totalUnreadMessageCount: LocalStore<u53>;

    private readonly _log: Logger;

    public constructor(private readonly _services: ServicesForModel) {
        this._log = _services.logging.logger('model.conversation-repository');

        // TODO(DESK-697): This is a ugly workaround to make some tests work,
        // but should be probably a private class attribute (not a trivial change as of now), or maybe be
        // moved down to DB level. This case was the origin of DESK-697.
        this._log.debug('Creating new cache');
        cache = createCache();
        message.recreateCaches();
        status.recreateCaches();

        this.totalUnreadMessageCount = derive(
            [this.getAll()],
            ([{currentValue: conversationModelStoreSet}], getAndSubscribe) => {
                let totalCount = 0;
                for (const conversationModelStore of conversationModelStoreSet) {
                    totalCount += getAndSubscribe(conversationModelStore).view.unreadMessageCount;
                }
                return totalCount;
            },
        );
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<ModelStore<Conversation>> {
        return all(this._services);
    }

    /** @inheritdoc */
    public getByUid(uid: DbConversationUid): ModelStore<Conversation> | undefined {
        return getByUid(this._services, uid, Existence.UNKNOWN);
    }

    /** @inheritdoc */
    public getForReceiver(receiver: DbReceiverLookup): ModelStore<Conversation> | undefined {
        const tag = getDebugTagForReceiver(receiver);
        return getByReceiver(this._services, receiver, Existence.UNKNOWN, tag);
    }

    /** @inheritdoc */
    public refreshCache(): void {
        // Empty the cache
        recreateCaches();
        all(this._services);
    }
}
