import type {
    DbAnyMessage,
    DbConversation,
    DbMessageCommon,
    DbMessageFor,
    DbMessageUid,
    DbMessageEditFor,
    UidOf,
} from '~/common/db';
import {
    CspE2eDeliveryReceiptStatus,
    Existence,
    MessageDirection,
    MessageReaction,
    MessageType,
    TriggerSource,
    ReceiverType,
} from '~/common/enum';
import {deleteFilesInBackground} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import type {
    AnyInboundNonDeletedMessageModelStore,
    AnyMessageModelStore,
    Contact,
    DirectedMessageFor,
    ServicesForModel,
} from '~/common/model';
import * as contact from '~/common/model/contact';
import {NO_SENDER} from '~/common/model/message/common';
import type {GuardedStoreHandle} from '~/common/model/types/common';
import type {Conversation, ConversationControllerHandle} from '~/common/model/types/conversation';
import {
    type BaseMessageView,
    type CommonBaseMessageView,
    type InboundBaseMessageController,
    type InboundBaseMessageView,
    type OutboundBaseMessageController,
    type OutboundBaseMessageView,
    type SetOfAnyLocalMessageModelStore,
    type MessageReactionView,
    type IdentityStringOrMe,
    OWN_IDENTITY_ALIAS,
    type MessageRepository,
    type UnifiedEditMessage,
    type MessageHistoryViewEntry,
    type CommonBaseFileMessageView,
    type UpdateFileBasedMessage,
    type AnyNonDeletedMessageType,
    type AnyNonDeletedMessageModelStore,
    type AnyDeletedMessageModelStore,
} from '~/common/model/types/message';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/outgoing-delivery-receipt';
import {OutgoingEditMessageTask} from '~/common/network/protocol/task/csp/outgoing-edit-message';
import type {IdentityString, MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {LazyMap} from '~/common/utils/map';
import {LocalSetStore} from '~/common/utils/store/set-store';

/**
 * Factory for creating stores and database entries for concrete message types.
 *
 * Note: This avoids a circular` dependency.
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

    readonly createDbMessage: <
        TDirection extends MessageDirection,
        TType extends AnyNonDeletedMessageType,
    >(
        services: ServicesForModel,
        common: Omit<DbMessageCommon<TType>, 'uid' | 'type' | 'ordinal'>,
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
    let extension;
    if (message.type !== MessageType.DELETED) {
        extension = {
            reactions: message.reactions,
            lastEditedAt: message.lastEditedAt,
            history: message.history.map(
                (val): MessageHistoryViewEntry => ({
                    editedAt: val.editedAt,
                    text: val.text ?? '',
                }),
            ),
        };
    } else {
        extension = {
            reactions: [],
            lastEditedAt: undefined,
            history: [],
            deletedAt: message.deletedAt,
        };
    }
    const common: CommonBaseMessageView = {
        id: message.id,
        createdAt: message.createdAt,
        readAt: message.readAt,
        ordinal: message.ordinal,
        ...extension,
    };

    switch (direction) {
        case MessageDirection.INBOUND: {
            if (message.type !== MessageType.DELETED) {
                assert(message.raw !== undefined, 'Expected inbound message to have a raw body');
            }
            assert(
                message.processedAt !== undefined,
                'Expected inbound message to have a `processedAt` value',
            );
            const inbound: InboundBaseMessageView = {
                ...common,
                direction: MessageDirection.INBOUND,
                receivedAt: message.processedAt,
                raw: message.type === MessageType.DELETED ? undefined : message.raw,
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
    common: Omit<DbMessageCommon<TType>, 'uid' | 'type' | 'ordinal' | 'lastEditedAt'>,
    store: LocalModelStore<Contact> | undefined,
] {
    // Gather common message data
    const common: Omit<
        DbMessageCommon<TType>,
        'uid' | 'type' | 'processedAt' | 'ordinal' | 'reactions' | 'lastEditedAt'
    > = {
        id: init.id,
        conversationUid,
        createdAt: init.createdAt,
        readAt: init.readAt,
        threadId: 1337n, // TODO(DESK-296): Set this properly
        history: [],
        deletedAt: undefined,
    };
    switch (init.direction) {
        case MessageDirection.INBOUND: {
            // Fetch the sender
            const sender = contact.getByUid(services, init.sender, Existence.ENSURED);
            return [
                {
                    ...common,
                    reactions: [],
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
                    reactions: [],
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
    init: DirectedMessageFor<MessageDirection, AnyNonDeletedMessageType, 'init'>,
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

export function editMessageByMessageUid(
    services: ServicesForModel,
    messageUid: DbMessageUid,
    type: AnyNonDeletedMessageType,
    change: DbMessageEditFor<AnyNonDeletedMessageType>,
): void {
    const {db} = services;
    db.editMessage(messageUid, type, change);
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
    uid: UidOf<DbMessageCommon<AnyNonDeletedMessageType>>,
    type: AnyNonDeletedMessageType,
    change: Partial<
        Omit<InboundBaseMessageView, 'receivedAt'> | Omit<OutboundBaseMessageView, 'sentAt'>
    >,
): void {
    const {db, file} = services;
    const {deletedFileIds} = db.updateMessage(conversationUid, {...change, type, uid});
    deleteFilesInBackground(file, log, deletedFileIds);
}

/**
 * Create or update a message reaction.
 */
function createOrUpdateReaction(
    services: ServicesForModel,
    messageUid: DbMessageUid,
    reaction: MessageReactionView,
): void {
    const {db} = services;
    db.createOrUpdateMessageReaction({
        messageUid,
        reactionAt: reaction.reactionAt,
        senderIdentity: reaction.senderIdentity,
        reaction: reaction.reaction,
    });
}

/**
 * Update the "sentAt" field of an outgoing message.
 */
function updateOutboundMessageSentAt(
    services: ServicesForModel,
    conversationUid: UidOf<DbConversation>,
    uid: UidOf<DbMessageCommon<AnyNonDeletedMessageType>>,
    type: AnyNonDeletedMessageType,
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
function removeFromDatabase(
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
 * Marks a message as deleted and deletes all entries in corresponding tables (such as reactions) as
 * well as files referenced by this message in the file storage. Such messages are first repurposed
 * to deleted messages in the database. The original message is then removed from the cache and
 * replaced with its deleted counterpart.
 *
 * @throws Error if the message type was not deletable or the (message, conversation)-pair was not
 * found in the database.
 */
export function deleteMessage(
    services: ServicesForModel,
    deletedAt: Date,
    conversation: ConversationControllerHandle,
    messageModel: AnyNonDeletedMessageModelStore,
    messageFactory: MessageFactory,
    log: Logger,
): AnyDeletedMessageModelStore {
    const {db, file} = services;
    const messageUid = messageModel.get().controller.uid;
    return messageModel.get().controller.meta.deactivate(() => {
        // Delete from database
        const {deletedMessage, deletedFileIds} = db.markMessageAsDeleted(
            conversation.uid,
            messageUid,
            deletedAt,
        );
        if (deletedMessage === undefined) {
            throw new Error(`Could not delete message with UID ${messageUid} from database`);
        }

        // Delete from file system
        deleteFilesInBackground(file, log, deletedFileIds);

        // Delete from cache
        caches.get(conversation.uid).remove(messageUid);

        return caches
            .get(conversation.uid)
            .add(messageUid, () =>
                createStore(services, conversation, messageFactory, deletedMessage, undefined),
            );
    });
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

/**
 * Update the caption of a file-based message and persist the change in its edit history.
 */
export function updateFileBasedMessageCaption<TFileMessageView extends CommonBaseFileMessageView>(
    services: ServicesForModel,
    messageType: AnyNonDeletedMessageType,
    messageUid: DbMessageUid,
    messageView: Readonly<TFileMessageView>,
    editedMessage: UnifiedEditMessage,
): UpdateFileBasedMessage {
    const change: Pick<Required<CommonBaseFileMessageView>, 'lastEditedAt' | 'caption'> = {
        lastEditedAt: editedMessage.lastEditedAt,
        caption: editedMessage.newText,
    };

    editMessageByMessageUid(services, messageUid, messageType, change);

    const newHistory: MessageHistoryViewEntry[] =
        messageView.history.length === 0
            ? [{text: messageView.caption ?? '', editedAt: messageView.createdAt}]
            : [...messageView.history];
    newHistory.push({
        editedAt: editedMessage.lastEditedAt,
        text: editedMessage.newText,
    });

    return {...change, history: newHistory};
}

export abstract class CommonBaseMessageController<TView extends CommonBaseMessageView> {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<TView>();

    protected readonly _log: Logger;

    public constructor(
        public readonly uid: UidOf<DbMessageCommon<MessageType>>,
        protected readonly _type: MessageType,
        protected readonly _conversation: ConversationControllerHandle,
        protected readonly _services: ServicesForModel,
    ) {
        this._log = _services.logging.logger(`model.message.${uid}`);
    }

    /**
     * Get the store of the {@link Conversation}, which this message is part of.
     */
    public conversation(): LocalModelStore<Conversation> {
        const conversationModelStore = this._services.model.conversations.getForReceiver(
            this._conversation.receiverLookup,
        );
        assert(
            conversationModelStore !== undefined,
            'Conversation is expected to exist, as it was looked up using its own handle',
        );
        return conversationModelStore;
    }

    /**
     * Remove the message.
     */
    public remove(): void {
        this.meta.deactivate(() =>
            removeFromDatabase(this._services, this._log, this._conversation.uid, this.uid),
        );
    }
}

/**
 * This class represents a controller for all messages that can be interacted with. Such
 * interactions may entail deleting, editing, reactions and so on.
 */
export abstract class CommonBaseNonDeletedMessageModelController<
    TView extends CommonBaseMessageView,
> extends CommonBaseMessageController<TView> {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        uid: UidOf<DbMessageCommon<AnyNonDeletedMessageType>>,
        protected override readonly _type: AnyNonDeletedMessageType,
        conversation: ConversationControllerHandle,
        services: ServicesForModel,
    ) {
        super(uid, _type, conversation, services);
    }

    protected _reaction(
        message: GuardedStoreHandle<TView>,
        view: Readonly<TView>,
        reaction: MessageReaction,
        reactionAt: Date,
        senderIdentity: IdentityStringOrMe,
    ): void {
        // Update the message
        message.update(() => {
            const messageReaction: MessageReactionView = {
                reactionAt,
                reaction,
                senderIdentity,
            };
            const filtered = view.reactions.filter((r) => r.senderIdentity !== senderIdentity);
            filtered.push(messageReaction);
            const change = {
                reactions: filtered,
            };
            createOrUpdateReaction(this._services, this.uid, messageReaction);
            return change as Partial<TView>;
        });
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
            update(this._services, this._log, this._conversation.uid, this.uid, this._type, change);
            return change as Partial<TView>;
        });

        // Update the unread count of the conversation
        if (isUnread && isInbound) {
            this._conversation.decrementUnreadMessageCount();
        }
    }

    /**
     * Update the message model using {@link editedMessage}. Return whether or not the message
     * update was applied successfully.
     *
     * Example: When editing a text message, an empty text is not valid. In that case, do not update
     * the model, but return false. Otherwise, return true.)
     *
     * Note: Tasks (e.g. the OutgoingMessageUpdateTask) should not be scheduled by this method, this
     * will be handled by the {@link CommonBaseMessageModelController} depending on the return type.
     */

    protected abstract _editMessage(
        message: GuardedStoreHandle<TView>,
        editedMessage: UnifiedEditMessage,
    ): boolean;
}

/** @inheritdoc */
export abstract class InboundBaseMessageModelController<TView extends InboundBaseMessageView>
    extends CommonBaseNonDeletedMessageModelController<TView>
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
            this._handleReaction(TriggerSource.LOCAL, type, reactedAt, OWN_IDENTITY_ALIAS),
        fromSync: (type: MessageReaction, reactedAt: Date, reactionSender: IdentityStringOrMe) =>
            this._handleReaction(TriggerSource.SYNC, type, reactedAt, reactionSender),
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            type: MessageReaction,
            reactedAt: Date,
            reactionSender: IdentityString,
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => this._handleReaction(TriggerSource.REMOTE, type, reactedAt, reactionSender),
    };

    /** @inheritdoc */
    public readonly editMessage: InboundBaseMessageController<TView>['editMessage'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromRemote: async (
            taskHandle: ActiveTaskCodecHandle<'volatile'>,
            editedMessage: UnifiedEditMessage,
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => {
            this.meta.run((handle) => {
                this._editMessage(handle, editedMessage);
                const conversation = this.conversation().get();
                const message = conversation.controller.getMessage(handle.view().id);
                assert(
                    message !== undefined,
                    'Existing messageId cannot reference undefined MessageModelStore',
                );
                assert(
                    message.ctx === MessageDirection.INBOUND,
                    'Cannot reference an outbound message from an inbound controller',
                );

                assert(
                    message.type !== MessageType.DELETED,
                    'Cannot edit a message that was already deleted',
                );

                this._updateNotificationForEditedMessage(message);
            });
        },
        fromSync: (editedMessage: UnifiedEditMessage) => {
            this.meta.run((handle) => {
                this._editMessage(handle, editedMessage);
            });
        },
    };

    public constructor(
        services: ServicesForModel,
        uid: UidOf<DbMessageCommon<MessageType>>,
        type: AnyNonDeletedMessageType,
        conversation: ConversationControllerHandle,
        protected readonly _sender: LocalModelStore<Contact>,
    ) {
        super(uid, type, conversation, services);
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
        source: TriggerSource,
        type: MessageReaction,
        reactedAt: Date,
        reactionSender: IdentityStringOrMe,
    ): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if this reaction of this person already exists
            if (
                view.reactions.filter(
                    (reaction) =>
                        reaction.senderIdentity === reactionSender && reaction.reaction === type,
                ).length !== 0
            ) {
                return;
            }

            // Ignore if somebody acks their own message outside of a group chat
            if (
                this._sender.get().view.identity === reactionSender &&
                this._conversation.receiverLookup.type !== ReceiverType.GROUP
            ) {
                return;
            }

            // Update database
            this._reaction(handle, view, type, reactedAt, reactionSender);

            // Queue a persistent task to send a notification, then reflect it.
            if (source === TriggerSource.LOCAL) {
                assert(
                    reactionSender === OWN_IDENTITY_ALIAS,
                    'Reaction with trigger source LOCAL must be from current user',
                );

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
                    this._conversation.getReceiver().get(),
                    status,
                    reactedAt,
                    [view.id],
                );
                this._services.taskManager.schedule(task).catch(() => {
                    // Ignore (task should persist)
                });
            }
        });
    }

    private _updateNotificationForEditedMessage(
        message: AnyInboundNonDeletedMessageModelStore,
    ): void {
        const conversation = this.conversation().get();
        this._services.notification
            .notifyMessageEdit(message, {
                receiver: conversation.controller.receiver(),
                view: conversation.view,
            })

            .catch(assertUnreachable);
    }
}

/** @inheritdoc */
export abstract class OutboundBaseMessageModelController<TView extends OutboundBaseMessageView>
    extends CommonBaseNonDeletedMessageModelController<TView>
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

        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (type: MessageReaction, reactedAt: Date) =>
            this._handleReaction(TriggerSource.LOCAL, type, reactedAt, OWN_IDENTITY_ALIAS),

        fromSync: (type: MessageReaction, reactedAt: Date, reactionSender: IdentityStringOrMe) =>
            this._handleReaction(TriggerSource.SYNC, type, reactedAt, reactionSender),

        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            type: MessageReaction,
            reactedAt: Date,
            reactionSender: IdentityString,
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => this._handleReaction(TriggerSource.REMOTE, type, reactedAt, reactionSender),
    };

    public readonly read: OutboundBaseMessageController<TView>['read'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (readAt: Date) => this._handleRead(readAt),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle: ActiveTaskCodecHandle<'volatile'>, readAt: Date) =>
            this._handleRead(readAt),
    };

    /** @inheritdoc */
    public readonly editMessage: OutboundBaseMessageController<TView>['editMessage'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (editedMessage: UnifiedEditMessage) => {
            this.meta.run((handle) => {
                const modelUpdated = this._editMessage(handle, editedMessage);
                if (modelUpdated) {
                    this._scheduleOutgoingEditMessageTask(handle, editedMessage.lastEditedAt);
                }
            });
        },

        fromSync: (editedMessage: UnifiedEditMessage) => {
            this.meta.run((handle) => {
                this._editMessage(handle, editedMessage);
            });
        },
    };

    public constructor(
        services: ServicesForModel,
        uid: UidOf<DbMessageCommon<MessageType>>,
        type: AnyNonDeletedMessageType,
        conversation: ConversationControllerHandle,
    ) {
        super(uid, type, conversation, services);
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
                    this.uid,
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
                    this.uid,
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

    private _handleReaction(
        source: TriggerSource,
        type: MessageReaction,
        reactedAt: Date,
        reactionSender: IdentityStringOrMe,
    ): void {
        this.meta.run((handle) => {
            const view = handle.view();

            // Ignore if this reaction of this person already exists
            // We also filter messages that were wrongly acked by ourselves if this was not a group
            if (
                view.reactions.some((reaction) => {
                    const reactionExists =
                        reaction.senderIdentity === reactionSender && reaction.reaction === type;
                    const isOwnReactionInNonGroupChat =
                        this._conversation.receiverLookup.type !== ReceiverType.GROUP &&
                        reactionSender === OWN_IDENTITY_ALIAS;
                    return reactionExists || isOwnReactionInNonGroupChat;
                })
            ) {
                return;
            }

            // Update database
            this._reaction(handle, view, type, reactedAt, reactionSender);

            // For local reactions, queue a persistent task to send and reflect the reaction.
            if (source === TriggerSource.LOCAL) {
                assert(
                    reactionSender === OWN_IDENTITY_ALIAS,
                    'Reaction with trigger source LOCAL must be from current user',
                );

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
                    this._conversation.getReceiver().get(),
                    status,
                    reactedAt,
                    [view.id],
                );
                this._services.taskManager.schedule(task).catch(() => {
                    // Ignore (task should persist)
                });
            }
        });
    }

    private _scheduleOutgoingEditMessageTask(
        storeHandle: GuardedStoreHandle<TView>,
        lastEditedAt: Date,
    ): void {
        const task = new OutgoingEditMessageTask(
            this._services,
            this._conversation.getReceiver().get(),
            this._conversation.getReceiver().get().controller.conversation(),
            storeHandle.view().id,
            lastEditedAt,
        );

        this._services.taskManager.schedule(task).catch((error) => {
            this._log.error(`Edit message task failed: ${error}`);
        });
    }
}

/** @inheritdoc */
export class MessageModelRepository implements MessageRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _tag = 'model.message-repository';
    private readonly _log: Logger;

    public constructor(private readonly _services: ServicesForModel) {
        this._log = _services.logging.logger(this._tag);
    }

    /** @inheritdoc */
    public findAllByText(text: string, limit?: u53): LocalSetStore<AnyNonDeletedMessageModelStore> {
        const {db, model} = this._services;

        const stores: AnyNonDeletedMessageModelStore[] = db
            .getMessageIdentifiersByText(text, limit)
            .map((message) => {
                // Look up the conversation.
                const conversationModelStore = model.conversations.getByUid(
                    message.conversationUid,
                );
                // Existence of the `conversationModelStore` should be guaranteed, as the message we
                // used to fetch it with wouldn't exist without it.
                assert(
                    conversationModelStore !== undefined,
                    `Expected conversation with UID ${message.conversationUid} to exist`,
                );

                const messageModelStore = conversationModelStore
                    .get()
                    .controller.getMessage(message.id);
                // Existence of the `messageModelStore` should be guaranteed, as the id we use to fetch
                // it came from the db itself.
                assert(
                    messageModelStore !== undefined,
                    `Expected MessageModelStore for message with UID ${message.uid} to exist`,
                );

                // The search results should not contain any deleted messages.
                assert(messageModelStore.type !== MessageType.DELETED);

                return messageModelStore;
            });

        return new LocalSetStore(new Set(stores), {
            debug: {
                log: this._log,
                tag: `${this._tag}.message[]`,
            },
        });
    }
}
