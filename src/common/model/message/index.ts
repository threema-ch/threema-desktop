import {
    type DbAnyMessage,
    type DbConversation,
    type DbMessageCommon,
    type DbMessageFor,
} from '~/common/db';
import {
    type MessageType,
    CspE2eDeliveryReceiptStatus,
    Existence,
    MessageDirection,
    MessageReaction,
    TriggerSource,
} from '~/common/enum';
import {
    type AnyMessageModelStore,
    type BaseMessageView,
    type CommonBaseMessageView,
    type Contact,
    type ConversationControllerHandle,
    type DirectedMessageFor,
    type GuardedStoreHandle,
    type InboundBaseMessageController,
    type InboundBaseMessageView,
    type InboundConversationPreviewMessageView,
    type OutboundBaseMessageController,
    type OutboundBaseMessageView,
    type OutboundConversationPreviewMessageView,
    type ServicesForModel,
    type SetOfAnyLocalMessageModelStore,
    type UidOf,
} from '~/common/model';
import * as contact from '~/common/model/contact';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/outgoing-delivery-receipt';
import {type MessageId} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {LazyMap} from '~/common/utils/map';
import {bigintSortAsc} from '~/common/utils/number';
import {LocalSetStore} from '~/common/utils/store/set-store';
import {type MessageStatus} from '~/common/viewmodel/types';

export const NO_SENDER = Symbol('no-sender');

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

const caches = new LazyMap<
    UidOf<DbConversation>,
    LocalModelStoreCache<UidOf<DbMessageCommon<MessageType>>, AnyMessageModelStore>
>(() => new LocalModelStoreCache<UidOf<DbMessageCommon<MessageType>>, AnyMessageModelStore>());

export function deactivateAndPurgeCache(conversationUid: UidOf<DbConversation>): void {
    // Purge all cached messages from the cache for that conversation
    const map = caches.pop(conversationUid)?.setRef.deref()?.get();
    if (map === undefined) {
        return;
    }

    // Deactivate all cached messages of that conversation
    for (const message of map.values()) {
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
        threadId: 1337n, // TODO(WEBMD-296): Set this properly
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

function getByUid(
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
    conversationUid: UidOf<DbConversation>,
    uid: UidOf<DbMessageCommon<MessageType>>,
    type: MessageType,
    change: Partial<
        Omit<InboundBaseMessageView, 'receivedAt'> | Omit<OutboundBaseMessageView, 'sentAt'>
    >,
): void {
    const {db} = services;
    db.updateMessage(conversationUid, {...change, type, uid});
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
    db.updateMessage(conversationUid, {type, uid, processedAt: sentAt});
}

/**
 * Delete the message with the specified {@link uid} from the database.
 */
function remove(
    services: ServicesForModel,
    conversationUid: UidOf<DbConversation>,
    uid: UidOf<DbMessageCommon<MessageType>>,
): void {
    const {db} = services;
    db.removeMessage(conversationUid, uid);
    caches.get(conversationUid).remove(uid);
}

export function all(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    factory: MessageFactory,
): SetOfAnyLocalMessageModelStore {
    return caches.get(conversation.uid).setRef.derefOrCreate(() => {
        const {db, logging} = services;
        const uids = [...db.getMessageUids(conversation.uid)]; // TODO(WEBMD-569): Incremental message loading
        // TODO(WEBMD-296): Messages don't currently have a defined order. Sort by UID for now.
        uids.sort(({uid: a}, {uid: b}) => bigintSortAsc(a, b));
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
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<TView>();

    public constructor(
        protected readonly _services: ServicesForModel,
        protected readonly _uid: UidOf<DbMessageCommon<MessageType>>,
        protected readonly _type: MessageType,
        protected readonly _conversation: ConversationControllerHandle,
    ) {}

    /**
     * Remove the message.
     */
    public remove(): void {
        this.meta.deactivate(() => remove(this._services, this._conversation.uid, this._uid));
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
            update(this._services, this._conversation.uid, this._uid, this._type, change);
            return change as Partial<TView>;
        });

        // Update the unread count of the conversation
        this._conversation.modifyUnreadMessageCount(isUnread && isInbound ? -1 : 0);
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
            update(this._services, this._conversation.uid, this._uid, this._type, change);
            return change as Partial<TView>;
        });
    }
}

/** @inheritdoc */
export abstract class InboundBaseMessageModelController<TView extends InboundBaseMessageView>
    extends CommonBaseMesageModelController<TView>
    implements InboundBaseMessageController<TView>
{
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<TView>();

    public readonly read: InboundBaseMessageController<TView>['read'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        fromSync: (readAt: Date) => this._handleRead(TriggerSource.SYNC, readAt),
    };

    public readonly reaction: InboundBaseMessageController<TView>['reaction'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
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
    public preview(): InboundConversationPreviewMessageView {
        return this.meta.run((handle) => {
            const view = handle.view();
            return {
                direction: MessageDirection.INBOUND,
                type: this._type,
                text: this._preview(),
                draft: false, // TODO(WEBMD-306): Add support for this
                updatedAt: view.createdAt,
                // TODO(WEBMD-776): Add proper support for other statuses
                status: 'delivered',
                reaction: view.lastReaction?.type,
            };
        });
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

    /**
     * Combine the common part with the concrete message part to create a preview.
     */
    protected abstract _preview(): InboundConversationPreviewMessageView['text'];
}

/** @inheritdoc */
export abstract class OutboundBaseMessageModelController<TView extends OutboundBaseMessageView>
    extends CommonBaseMesageModelController<TView>
    implements OutboundBaseMessageController<TView>
{
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<TView>();

    public readonly delivered: OutboundBaseMessageController<TView>['delivered'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        fromSync: (deliveredAt: Date) => this._handleDelivered(deliveredAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, deliveredAt: Date) =>
            this._handleDelivered(deliveredAt),
    };

    public readonly reaction: OutboundBaseMessageController<TView>['reaction'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        fromSync: (type: MessageReaction, reactedAt: Date) => this._handleReaction(type, reactedAt),

        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            type: MessageReaction,
            reactedAt: Date,
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => this._handleReaction(type, reactedAt),
    };

    public readonly read: OutboundBaseMessageController<TView>['read'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
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
    public preview(): OutboundConversationPreviewMessageView {
        return this.meta.run((handle) => {
            const view = handle.view();
            const [status, updatedAt] = statusFromView(view);
            return {
                direction: MessageDirection.OUTBOUND,
                type: this._type,
                text: this._preview(),
                draft: false, // TODO(WEBMD-306): Add support for this
                updatedAt,
                // TODO(WEBMD-776): Add proper support for other statuses (error?)
                status,
                reaction: view.lastReaction?.type,
            };
        });
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
                update(this._services, this._conversation.uid, this._uid, this._type, change);
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

    /**
     * Combine the common part with the concrete message part to create a preview.
     */
    protected abstract _preview(): OutboundConversationPreviewMessageView['text'];
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
    } else {
        return ['pending', view.createdAt];
    }
}
