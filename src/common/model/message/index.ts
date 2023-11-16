import type {DbAnyMessage, DbConversation, DbMessageCommon, DbMessageFor, UidOf} from '~/common/db';
import {
    CspE2eDeliveryReceiptStatus,
    Existence,
    MessageDirection,
    MessageReaction,
    type MessageType,
    TriggerSource,
} from '~/common/enum';
import {deleteFilesInBackground} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import type {
    AnyMessageModelStore,
    Contact,
    DirectedMessageFor,
    ServicesForModel,
} from '~/common/model';
import * as contact from '~/common/model/contact';
import {NO_SENDER} from '~/common/model/message/common';
import type {GuardedStoreHandle} from '~/common/model/types/common';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    BaseMessageView,
    CommonBaseMessageView,
    InboundBaseMessageController,
    InboundBaseMessageView,
    OutboundBaseMessageController,
    OutboundBaseMessageView,
    SetOfAnyLocalMessageModelStore,
} from '~/common/model/types/message';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/outgoing-delivery-receipt';
import type {MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {LazyMap} from '~/common/utils/map';
import {LocalSetStore} from '~/common/utils/store/set-store';
import type {MessageStatus} from '~/common/viewmodel/types';

/**
 * Factory for creating stores and database entries for concrete message types.
 *
 * Note: This avoids a circular dependency.
 */
export interface MessageFactory {
    readonly createStore: <TLocalModelStore extends AnyMessageModelStore>(
        services: ServicesForModel,
        direction: TLocalModelStore['ctx'],
        conversation: ConversationControllerHandle,
        message: DbMessageFor<TLocalModelStore['type']>,
        common: BaseMessageView<TLocalModelStore['ctx']>,
        sender: LocalModelStore<Contact> | typeof NO_SENDER,
    ) => TLocalModelStore;

    readonly createDbMessage: <TDirection extends MessageDirection, TType extends MessageType>(
        services: ServicesForModel,
        common: Omit<DbMessageCommon<TType>, 'uid' | 'type'>,
        init: DirectedMessageFor<TDirection, TType, 'init'>,
    ) => DbMessageFor<TType>;
}

// TODO(DESK-697)
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createCaches() {
    return new LazyMap<
        UidOf<DbConversation>,
        LocalModelStoreCache<UidOf<DbMessageCommon<MessageType>>, AnyMessageModelStore>
    >(() => new LocalModelStoreCache<UidOf<DbMessageCommon<MessageType>>, AnyMessageModelStore>());
}

let caches = createCaches();

/**
 * TODO(DESK-697): Remove this
 */
export function recreateCaches(): void {
    caches = createCaches();
}

export function deactivateAndPurgeCache(conversationUid: UidOf<DbConversation>): void {
    // Purge all cached messages from the cache for that conversation
    const set = caches.pop(conversationUid)?.setRef.deref()?.get();
    if (set === undefined) {
        return;
    }

    // Deactivate all cached messages of that conversation
    deactivateMessages([...set]);
}

/**
 * Deactivate the model controller for all specified messages.
 */
function deactivateMessages(messages: AnyMessageModelStore[]): void {
    for (const message of messages) {
        message.get().controller.meta.deactivate();
    }
}

function getCommonView<TDirection extends MessageDirection>(
    direction: TDirection,
    message: DbAnyMessage,
): BaseMessageView<TDirection> {
    const common: CommonBaseMessageView = {
        id: message.id,
        createdAt: message.createdAt,
        readAt: message.readAt,
        lastReaction: message.lastReaction,
    };
    switch (direction) {
        case MessageDirection.INBOUND: {
            assert(message.raw !== undefined, 'Expected inbound message to have a raw body');
            assert(
                message.processedAt !== undefined,
                'Expected inbound message to have a `processedAt` value',
            );
            const inbound: InboundBaseMessageView = {
                ...common,
                direction: MessageDirection.INBOUND,
                receivedAt: message.processedAt,
                raw: message.raw,
            };
            return inbound as BaseMessageView<TDirection>;
        }
        case MessageDirection.OUTBOUND: {
            const outbound: OutboundBaseMessageView = {
                ...common,
                direction: MessageDirection.OUTBOUND,
                sentAt: message.processedAt,
                deliveredAt: message.deliveredAt,
            };
            return outbound as BaseMessageView<TDirection>;
        }
        default:
            return unreachable(direction);
    }
}

function createStore<TModelStore extends AnyMessageModelStore>(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
    message: DbMessageFor<TModelStore['type']>,
    senderHint: LocalModelStore<Contact> | undefined,
): TModelStore {
    // Determine direction and lookup the sender (if inbound)
    //
    // Note: Technically, the determined direction might not be TDirection.
    //       The caller needs to ensure that a mismatch is not possible.
    let direction: MessageDirection;
    let sender: LocalModelStore<Contact> | typeof NO_SENDER;
    if (message.senderContactUid !== undefined) {
        direction = MessageDirection.INBOUND;

        // Note: The protocol should ensure that an associated contact does
        //       indeed exist, so we don't need to do an existence check.
        sender =
            senderHint ?? contact.getByUid(services, message.senderContactUid, Existence.ENSURED);
    } else {
        direction = MessageDirection.OUTBOUND;
        sender = NO_SENDER;
    }

    // Gather common view data
    const common = getCommonView<TModelStore['ctx']>(direction, message);

    // Create a store
    const store = factory.createStore(services, direction, conversation, message, common, sender);
    return store;
}

function getCommonDbMessageData<TDirection extends MessageDirection, TType extends MessageType>(
    services: ServicesForModel,
    conversationUid: UidOf<DbConversation>,
    init: DirectedMessageFor<TDirection, TType, 'init'>,
): [
    common: Omit<DbMessageCommon<TType>, 'uid' | 'type'>,
    store: LocalModelStore<Contact> | undefined,
] {
    // Gather common message data
    const common: Omit<DbMessageCommon<TType>, 'uid' | 'type' | 'processedAt'> = {
        id: init.id,
        conversationUid,
        createdAt: init.createdAt,
        readAt: init.readAt,
        lastReaction: init.lastReaction,
        threadId: 1337n, // TODO(DESK-296): Set this properly
    };
    switch (init.direction) {
        case MessageDirection.INBOUND: {
            // Fetch the sender
            const sender = contact.getByUid(services, init.sender, Existence.ENSURED);
            return [
                {
                    ...common,
                    senderContactUid: init.sender,
                    processedAt: init.receivedAt,
                    raw: init.raw,
                },
                sender,
            ];
        }
        case MessageDirection.OUTBOUND:
            return [
                {
                    ...common,
                },
                undefined,
            ];
        default:
            return unreachable(init);
    }
}

export function create(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
    init: DirectedMessageFor<MessageDirection, MessageType, 'init'>,
): AnyMessageModelStore {
    // Gather common message data
    const [common, sender] = getCommonDbMessageData(services, conversation.uid, init);

    // Create the message and return the store
    const message = factory.createDbMessage(services, common, init);
    return caches
        .get(conversation.uid)
        .add(message.uid, () => createStore(services, conversation, factory, message, sender));
}

export function getByUid(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
    uid: UidOf<DbMessageCommon<MessageType>>,
    existence: Existence.ENSURED,
): AnyMessageModelStore {
    // Note: This function assumes that existence is ensured.
    return caches.get(conversation.uid).getOrAdd(uid, () => {
        const {db} = services;

        // Lookup the message
        const message = db.getMessageByUid(uid);
        assert(message !== undefined, `Expected message with UID ${uid} to exist`);

        // Create a store
        return createStore(services, conversation, factory, message, undefined);
    });
}

export function isMessagePresentInConversation(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    messageId: MessageId,
): boolean {
    return services.db.hasMessageById(conversation.uid, messageId) !== undefined;
}

export function getByMessageId(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
    messageId: MessageId,
): AnyMessageModelStore | undefined {
    const {db} = services;

    // Check if the message exists, then return the store
    const uid = db.hasMessageById(conversation.uid, messageId);
    if (uid === undefined) {
        return undefined;
    }
    return getByUid(services, conversation, factory, uid, Existence.ENSURED);
}

export function getLastMessage(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
): AnyMessageModelStore | undefined {
    const {db} = services;

    // Lookup the message
    const message = db.getLastMessage(conversation.uid);
    if (message === undefined) {
        return undefined;
    }

    return caches
        .get(conversation.uid)
        .getOrAdd(message.uid, () =>
            createStore(services, conversation, factory, message, undefined),
        );
}

export function getConversationMessageCount(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
): u53 {
    const {db} = services;

    return db.getConversationMessageCount(conversation.uid);
}

export function getFirstUnreadMessageId(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
): MessageId | undefined {
    const {db} = services;

    // Lookup the message
    return db.getFirstUnreadMessage(conversation.uid)?.id;
}

/**
 * Update a message with the specified changeset.
 *
 * Note: The `sentAt` (for outgoing messages) and `receivedAt` (for incoming messages) fields cannot
 *       be updated through this function. For changing `sentAt`, use
 *       {@link updateOutboundMessageSentAt} instead. For incoming messages, the `receivedAt` field
 *       will be set when inserting the message into the database, it is never updated afterwards.
 */
function update(
    services: ServicesForModel,
    log: Logger,
    conversationUid: UidOf<DbConversation>,
    uid: UidOf<DbMessageCommon<MessageType>>,
    type: MessageType,
    change: Partial<
        Omit<InboundBaseMessageView, 'receivedAt'> | Omit<OutboundBaseMessageView, 'sentAt'>
    >,
): void {
    const {db, file} = services;
    const {deletedFileIds} = db.updateMessage(conversationUid, {...change, type, uid});
    deleteFilesInBackground(file, log, deletedFileIds);
}

/**
 * Update the "sentAt" field of an outgoing message.
 */
function updateOutboundMessageSentAt(
    services: ServicesForModel,
    conversationUid: UidOf<DbConversation>,
    uid: UidOf<DbMessageCommon<MessageType>>,
    type: MessageType,
    sentAt: Date,
): void {
    const {db} = services;
    // Note: Ignoring `deletedFileIds` since this update cannot result in file deletion
    db.updateMessage(conversationUid, {type, uid, processedAt: sentAt});
}

/**
 * Delete the message with the specified {@link uid} from the database, the cache and the file
 * system.
 */
function remove(
    services: ServicesForModel,
    log: Logger,
    conversationUid: UidOf<DbConversation>,
    uid: UidOf<DbMessageCommon<MessageType>>,
): void {
    const {db, file} = services;

    // Delete from database
    const {removed, deletedFileIds} = db.removeMessage(conversationUid, uid);
    if (!removed) {
        throw new Error(`Could not delete message with UID ${uid} from database`);
    }

    // Delete from cache
    caches.get(conversationUid).remove(uid);

    // Delete from file system
    deleteFilesInBackground(file, log, deletedFileIds);
}

/**
 * Delete all messages for the given conversation from the database, the cache and the file system.
 */
export function removeAll(
    services: ServicesForModel,
    log: Logger,
    conversationUid: UidOf<DbConversation>,
): void {
    const {db, file} = services;

    // Delete from database
    const {deletedFileIds} = db.removeAllMessages(conversationUid, false);

    const messageSet = caches.get(conversationUid).setRef.deref();
    const messagesToDeactivate = messageSet === undefined ? [] : [...messageSet.get()];

    // Delete from cache
    caches.get(conversationUid).clear();

    deactivateMessages(messagesToDeactivate);

    // Delete from file system
    deleteFilesInBackground(file, log, deletedFileIds);
}

export function all(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
): SetOfAnyLocalMessageModelStore {
    return caches.get(conversation.uid).setRef.derefOrCreate(() => {
        const {db, logging} = services;
        const uids = [...db.getMessageUids(conversation.uid)];
        const messages = uids.map(({uid}) =>
            getByUid(services, conversation, factory, uid, Existence.ENSURED),
        );
        const tag = `message[]`;
        return new LocalSetStore<AnyMessageModelStore>(
            new Set(messages as readonly AnyMessageModelStore[]),
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    });
}

abstract class CommonBaseMesageModelController<TView extends CommonBaseMessageView> {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<TView>();

    protected readonly _log: Logger;

    public constructor(
        protected readonly _services: ServicesForModel,
        protected readonly _uid: UidOf<DbMessageCommon<MessageType>>,
        protected readonly _type: MessageType,
        protected readonly _conversation: ConversationControllerHandle,
    ) {
        this._log = _services.logging.logger(`model.message.${_uid}`);
    }

    /**
     * Remove the message.
     */
    public remove(): void {
        this.meta.deactivate(() =>
            remove(this._services, this._log, this._conversation.uid, this._uid),
        );
    }

    protected _read(
        message: GuardedStoreHandle<TView>,
        view: Readonly<TView>,
        readAt: Date,
        direction: MessageDirection,
    ): void {
        const isUnread = view.readAt === undefined;
        const isInbound = direction === MessageDirection.INBOUND;

        // Update the message
        message.update(() => {
            const change = {readAt};
            update(
                this._services,
                this._log,
                this._conversation.uid,
                this._uid,
                this._type,
                change,
            );
            return change as Partial<TView>;
        });

        // Update the unread count of the conversation
        if (isUnread && isInbound) {
            this._conversation.decrementUnreadMessageCount();
        }
    }

    protected _reaction(
        message: GuardedStoreHandle<TView>,
        view: Readonly<TView>,
        reaction: MessageReaction,
        reactedAt: Date,
    ): void {
        // Update the message
        message.update(() => {
            const change = {
                lastReaction: {at: reactedAt, type: reaction},
            } as const;
            update(
                this._services,
                this._log,
                this._conversation.uid,
                this._uid,
                this._type,
                change,
            );
            return change as Partial<TView>;
        });
    }
}

/** @inheritdoc */
export abstract class InboundBaseMessageModelController<TView extends InboundBaseMessageView>
    extends CommonBaseMesageModelController<TView>
    implements InboundBaseMessageController<TView>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public override readonly meta = new ModelLifetimeGuard<TView>();

    public readonly read: InboundBaseMessageController<TView>['read'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (readAt: Date) => this._handleRead(TriggerSource.SYNC, readAt),
    };

    public readonly reaction: InboundBaseMessageController<TView>['reaction'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (type: MessageReaction, reactedAt: Date) =>
            this._handleReaction(TriggerSource.LOCAL, type, reactedAt),
        fromSync: (type: MessageReaction, reactedAt: Date) =>
            this._handleReaction(TriggerSource.SYNC, type, reactedAt),
    };

    public constructor(
        services: ServicesForModel,
        uid: UidOf<DbMessageCommon<MessageType>>,
        type: MessageType,
        conversation: ConversationControllerHandle,
        protected readonly _sender: LocalModelStore<Contact>,
    ) {
        super(services, uid, type, conversation);
    }

    /** @inheritdoc */
    public sender(): LocalModelStore<Contact> {
        return this._sender;
    }

    /** @inheritdoc */
    private _handleRead(source: TriggerSource.SYNC, readAt: Date): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if already marked as read
            if (view.readAt !== undefined) {
                return;
            }

            // Update the conversation and the message
            this._read(handle, view, readAt, MessageDirection.INBOUND);
        });
    }

    /** @inheritdoc */
    private _handleReaction(
        source: TriggerSource.SYNC | TriggerSource.LOCAL,
        type: MessageReaction,
        reactedAt: Date,
    ): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if reaction has been repeated
            if (view.lastReaction !== undefined && view.lastReaction.type === type) {
                return;
            }

            // Update database
            this._reaction(handle, view, type, reactedAt);

            // Queue a persistent task to send a notification, then reflect it.
            if (source === TriggerSource.LOCAL) {
                let status: CspE2eDeliveryReceiptStatus;
                switch (type) {
                    case MessageReaction.ACKNOWLEDGE:
                        status = CspE2eDeliveryReceiptStatus.ACKNOWLEDGED;
                        break;
                    case MessageReaction.DECLINE:
                        status = CspE2eDeliveryReceiptStatus.DECLINED;
                        break;
                    default:
                        unreachable(type);
                }
                const task = new OutgoingDeliveryReceiptTask(
                    this._services,
                    this._sender,
                    status,
                    reactedAt,
                    [view.id],
                );
                void this._services.taskManager.schedule(task);
            }
        });
    }
}

/** @inheritdoc */
export abstract class OutboundBaseMessageModelController<TView extends OutboundBaseMessageView>
    extends CommonBaseMesageModelController<TView>
    implements OutboundBaseMessageController<TView>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public override readonly meta = new ModelLifetimeGuard<TView>();

    public readonly delivered: OutboundBaseMessageController<TView>['delivered'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (deliveredAt: Date) => this._handleDelivered(deliveredAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, deliveredAt: Date) =>
            this._handleDelivered(deliveredAt),
    };

    public readonly reaction: OutboundBaseMessageController<TView>['reaction'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (type: MessageReaction, reactedAt: Date) => this._handleReaction(type, reactedAt),

        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            type: MessageReaction,
            reactedAt: Date,
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => this._handleReaction(type, reactedAt),
    };

    public readonly read: OutboundBaseMessageController<TView>['read'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (readAt: Date) => this._handleRead(readAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, readAt: Date) =>
            this._handleRead(readAt),
    };

    public constructor(
        services: ServicesForModel,
        uid: UidOf<DbMessageCommon<MessageType>>,
        type: MessageType,
        conversation: ConversationControllerHandle,
    ) {
        super(services, uid, type, conversation);
    }

    /** @inheritdoc */
    public sent(sentAt: Date): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if already marked as sent
            if (view.sentAt !== undefined) {
                return;
            }

            // Update the message
            handle.update(() => {
                updateOutboundMessageSentAt(
                    this._services,
                    this._conversation.uid,
                    this._uid,
                    this._type,
                    sentAt,
                );
                return {sentAt} as Partial<TView>;
            });
        });
    }

    private _handleDelivered(deliveredAt: Date): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if already marked as delivered
            if (view.deliveredAt !== undefined) {
                return;
            }

            // Update the message
            handle.update(() => {
                const change = {deliveredAt};
                update(
                    this._services,
                    this._log,
                    this._conversation.uid,
                    this._uid,
                    this._type,
                    change,
                );
                return change as Partial<TView>;
            });
        });
    }

    private _handleRead(readAt: Date): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if already marked as read
            if (view.readAt !== undefined) {
                return;
            }

            // Update the conversation and the message
            this._read(handle, view, readAt, MessageDirection.OUTBOUND);
        });
    }

    private _handleReaction(type: MessageReaction, reactedAt: Date): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if reaction has been repeated
            if (view.lastReaction !== undefined && view.lastReaction.type === type) {
                return;
            }

            // Update database
            this._reaction(handle, view, type, reactedAt);
        });
    }
}

/**
 * Return the message status and the corresponding date for the specified outbound message view.
 */
export function statusFromView(
    view: Readonly<OutboundBaseMessageView>,
): [status: MessageStatus, updatedAt: Date] {
    if (view.readAt !== undefined) {
        return ['read', view.readAt];
    } else if (view.deliveredAt !== undefined) {
        return ['delivered', view.deliveredAt];
    } else if (view.sentAt !== undefined) {
        return ['sent', view.sentAt];
    }
    return ['pending', view.createdAt];
}
