import type {DbConversationUid, DbReceiverLookup, UidOf} from '~/common/db';
import {
    AcquaintanceLevel,
    ConversationVisibility,
    CspE2eDeliveryReceiptStatus,
    Existence,
    MessageDirection,
    MessageQueryDirection,
    type MessageType,
    ReadReceiptPolicy,
    ReceiverType,
    TriggerSource,
} from '~/common/enum';
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
    AnyInboundMessageModelStore,
    AnyMessageModelStore,
    AnyOutboundMessageModelStore,
    DirectedMessageFor,
    SetOfAnyLocalMessageModelStore,
} from '~/common/model/types/message';
import type {AnyReceiver, AnyReceiverStore} from '~/common/model/types/receiver';
import {getDebugTagForReceiver} from '~/common/model/utils/debug-tags';
import {LazyWeakRef, LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {InternalActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingConversationMessageTask} from '~/common/network/protocol/task/csp/outgoing-conversation-message';
import {OutgoingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/outgoing-delivery-receipt';
import {ReflectContactSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-contact-sync-transaction';
import {ReflectGroupSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-group-sync-transaction';
import {ReflectIncomingMessageUpdateTask} from '~/common/network/protocol/task/d2d/reflect-message-update';
import type {ConversationId, MessageId} from '~/common/network/types';
import type {i53, Mutable, u53} from '~/common/types';
import {assert, assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {
    createExactPropertyValidator,
    type Exact,
    OPTIONAL,
} from '~/common/utils/property-validator';
import {type LocalStore, WritableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalSetStore} from '~/common/utils/store/set-store';

import * as contact from './contact';
import * as group from './group';
import * as message from './message';
import {MESSAGE_FACTORY} from './message/factory';

// TODO(DESK-697)
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createCache() {
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
}

let cache = createCache();

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

/**
 * Fetch a conversation model by its `uid`.
 */
export function getByUid(
    services: ServicesForModel,
    uid: DbConversationUid,
    existence: Existence,
    tag?: string,
): LocalModelStore<Conversation> | undefined {
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
            init: DirectedMessageFor<MessageDirection.OUTBOUND, MessageType, 'init'>,
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
            const precondition = (): boolean => this.meta.active;

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

    private readonly _handle: ConversationControllerHandle;
    private readonly _lock = new AsyncLock();
    private readonly _log: Logger;

    // Stores
    private readonly _lastMessageStore: WritableStore<AnyMessageModelStore | undefined>;
    private readonly _lastConversationUpdateStore: WritableStore<Date>;

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
        this._lastConversationUpdateStore = new WritableStore(new Date());
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
    public lastConversationUpdateStore(): LocalStore<Date> {
        return this._lastConversationUpdateStore;
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
        messageIds: ReadonlySet<MessageId>,
        contextSize: u53,
    ): Set<AnyMessageModelStore> {
        const {db} = this._services;
        return this.meta.run(() => {
            // Get sorted list of UIDs
            const sortedUids = db.getSortedMessageUids(this.uid, messageIds).map((uid) => ({uid}));
            if (sortedUids.length === 0) {
                return new Set();
            }

            // Add messages older than oldest message
            const oldestUid = unwrap(sortedUids.at(0));
            const olderMessages = [
                ...this.meta.run(() =>
                    db.getMessageUids(this.uid, contextSize, {
                        direction: MessageQueryDirection.OLDER,
                        uid: oldestUid.uid,
                    }),
                ),
            ];

            // Add messages newer than newest message
            const newestUid = unwrap(sortedUids.at(-1));
            const newerMessages = this.meta.run(() =>
                db.getMessageUids(this.uid, contextSize, {
                    direction: MessageQueryDirection.NEWER,
                    uid: newestUid.uid,
                }),
            );

            // Return set of unique message stores
            //
            // Note: The store for the two reference messages is fetched twice. That's not a problem
            //       though, thanks to caching, and because the set discards duplicates.
            return new Set(
                [...olderMessages, ...sortedUids, ...newerMessages].map((dbMessageListing) =>
                    message.getByUid(
                        this._services,
                        this._handle,
                        MESSAGE_FACTORY,
                        dbMessageListing.uid,
                        Existence.ENSURED,
                    ),
                ),
            );
        });
    }

    /** @inheritdoc */
    public getMessageCount(): u53 {
        return message.getConversationMessageCount(this._services, this._handle);
    }

    /** @inheritdoc */
    public getFirstUnreadMessageId(): MessageId | undefined {
        return message.getFirstUnreadMessageId(this._services, this._handle);
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
                this.meta.active &&
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
        this.update.fromSync({lastUpdate}, unreadMessageCountDelta);

        // Store the message in the DB and retrieve the model
        const store = message.create(this._services, this._handle, MESSAGE_FACTORY, init);

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
     * - Update {@link _lastMessageStore} with the last message of the conversation
     * - Update {@link _lastConversationUpdateStore} with the current timestamp
     */
    private _updateStoresOnConversationUpdate(): void {
        // Note: Update the "last message" store before updating the "last conversation update"
        // store. This way, when subscribing to conversation updates, the last message can be
        // fetched from the "last message" store and will already be correct.
        this._lastMessageStore.set(
            message.getLastMessage(this._services, this._handle, MESSAGE_FACTORY),
        );
        this._lastConversationUpdateStore.set(new Date());
    }
}

function all(services: ServicesForModel): LocalSetStore<LocalModelStore<Conversation>> {
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

export class ConversationModelStore extends LocalModelStore<Conversation> {
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

        this.totalUnreadMessageCount = derive(this.getAll(), (conversations, getAndSubscribe) => {
            let totalCount = 0;
            for (const conversation of conversations) {
                totalCount += getAndSubscribe(conversation).view.unreadMessageCount;
            }
            return totalCount;
        });
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<LocalModelStore<Conversation>> {
        return all(this._services);
    }

    /** @inheritdoc */
    public getByUid(uid: DbConversationUid): LocalModelStore<Conversation> | undefined {
        return getByUid(this._services, uid, Existence.UNKNOWN);
    }

    /** @inheritdoc */
    public getForReceiver(receiver: DbReceiverLookup): LocalModelStore<Conversation> | undefined {
        const tag = getDebugTagForReceiver(receiver);
        return getByReceiver(this._services, receiver, Existence.UNKNOWN, tag);
    }

    /** @inheritdoc */
    public async softDeleteByUid(uid: DbConversationUid): Promise<void> {
        const conversation = getByUid(this._services, uid, Existence.UNKNOWN);
        if (conversation === undefined) {
            return;
        }

        await conversation.get().controller.removeAllMessages.fromLocal();
        /**
         * Soft-delete a conversation (i.e., the conversation is kept in the database but is not
         * shown in the conversation list any more).
         */
        conversation.get().controller.update.fromSync({lastUpdate: undefined});
    }
}
