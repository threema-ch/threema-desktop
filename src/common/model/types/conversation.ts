import type {DbConversation, DbConversationUid, DbReceiverLookup, UidOf} from '~/common/db';
import type {
    ConversationCategory,
    ConversationVisibility,
    MessageDirection,
    ReceiverType,
    StatusMessageType,
} from '~/common/enum';
import type {
    ControllerCustomUpdate,
    ControllerUpdate,
    ControllerUpdateDirect,
    ControllerUpdateFromLocal,
    ControllerUpdateFromSource,
    Model,
} from '~/common/model/types/common';
import type {
    AnyMessageModelStore,
    AnyNonDeletedMessageModelStore,
    AnyNonDeletedMessageType,
    DirectedMessageFor,
    SetOfAnyLocalMessageModelStore,
} from '~/common/model/types/message';
import type {AnyReceiverStore} from '~/common/model/types/receiver';
import type {AnyStatusMessageModelStore, StatusMessageView} from '~/common/model/types/status';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {ConversationId, MessageId, StatusMessageId} from '~/common/network/types';
import type {i53, u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import type {IDerivableSetStore, LocalSetStore} from '~/common/utils/store/set-store';

export interface ConversationInitMixin {
    readonly lastUpdate?: Date;
    readonly category: ConversationCategory;
    readonly visibility: ConversationVisibility;
}

export interface ConversationView {
    // TODO(DESK-611): Remove type from ConversationView and get it from the new ConversationViewModel
    readonly type: ReceiverType;
    readonly lastUpdate?: Date;
    readonly unreadMessageCount: u53;
    readonly category: ConversationCategory;
    readonly visibility: ConversationVisibility;
    readonly isTyping?: boolean;
}
export type ConversationInit = Omit<ConversationView, 'type'>;
export type ConversationUpdate = Partial<Omit<ConversationView, 'unreadMessageCount' | 'type'>>;
/**
 * Conversation update that may be processed from/to the other devices to/from the local device via D2D sync.
 */
export type ConversationUpdateFromToSync = Pick<ConversationUpdate, 'category' | 'visibility'>;
export type ConversationController = {
    readonly uid: UidOf<DbConversation>;
    readonly receiverLookup: DbReceiverLookup;
    readonly lifetimeGuard: ModelLifetimeGuard<ConversationView>;
    readonly receiver: () => AnyReceiverStore;
    /**
     * A store that contains the last message sent or received in this conversation (or none, if there has never been a conversation message).
     */
    readonly lastMessageStore: () => LocalStore<AnyMessageModelStore | undefined>;

    /**
     * A store that contains the last (newest) status message (or none, if there has never been a status message).
     */
    readonly lastStatusMessageStore: () => LocalStore<AnyStatusMessageModelStore | undefined>;

    /**
     * Return a store that contains the timestamp of the last conversation update. The store is
     * initialized with the current date.
     *
     * Things that update the store:
     *
     * - A message or status message is added.
     * - A message or status message is removed.
     * - The conversation is cleared.
     *
     * Note that changes to an existing message do not trigger an update to this store.
     */
    readonly lastModificationStore: () => LocalStore<Date>;

    /**
     * Update a conversation.
     *
     * If {@link unreadMessageCountDelta} is set, the unread message count will be incremented or
     * decremented by the specified amount. Note that the unread message count can never go below 0.
     */
    readonly update: Omit<
        ControllerUpdate<[change: ConversationUpdate, unreadMessageCountDelta?: i53]>,
        'fromLocal' | 'fromRemote'
    >;

    /**
     * Update the visibility of a conversation.
     */
    readonly updateVisibility: Omit<
        ControllerUpdateFromSource<[visibility: ConversationVisibility]>,
        'fromRemote' | 'fromSync'
    >;

    readonly updateTyping: ControllerUpdateFromSource<[typing: boolean]>;

    /**
     * Add a new message to this conversation.
     *
     * The message will be stored in the database. If `source` is `TriggerSource.LOCAL`, the
     * outgoing message task will be triggered.
     *
     * Note: This triggers an update of the `_lastModificationStore`.
     */
    readonly addMessage: ControllerCustomUpdate<
        [init: DirectedMessageFor<MessageDirection.OUTBOUND, AnyNonDeletedMessageType, 'init'>], // FromLocal
        [init: DirectedMessageFor<MessageDirection, AnyNonDeletedMessageType, 'init'>], // FromSync
        [init: DirectedMessageFor<MessageDirection.INBOUND, AnyNonDeletedMessageType, 'init'>], // FromRemote
        [init: DirectedMessageFor<MessageDirection, AnyNonDeletedMessageType, 'init'>], // Direct
        AnyNonDeletedMessageModelStore
    >;

    /**
     * Remove a message from this conversation.
     *
     * The message will be only removed from the device where the action is executed. I.e. this
     * action is not reflected.
     *
     * Note: This triggers an update of the `_lastModificationStore`.
     */
    readonly removeMessage: ControllerUpdateDirect<[uid: MessageId]>;

    /**
     * Remove all messages from this conversation.
     *
     * The messages will be only removed from the device where the action is executed. I.e. this
     * action is not reflected.
     *
     * Note: This triggers an update of the `_lastModificationStore`.
     */
    readonly removeAllMessages: ControllerUpdateDirect;

    /**
     * Remove a status message from this conversation. This is a local action, i.e it is not reflected.
     *
     * Note: This triggers an update of the `_lastModificationStore`.
     */
    readonly removeStatusMessage: ControllerUpdateDirect<[uid: StatusMessageId]>;

    /**
     * Remove all status messages from this conversation. This is a local action, i.e it is not reflected.
     *
     * Note: This triggers an update of the `_lastModificationStore`.
     */
    readonly removeAllStatusMessages: ControllerUpdateDirect;

    /**
     * Mark a message as deleted. Contrary to `removeMessage`, this function deletes all text
     * and additional data from the message and marks it as deleted, disabling any interaction with
     * the message except for removing it. This operation is irreversible and is reflected to all
     * devices, as well as sent to all members of the current conversation.
     *
     * @throws if the message could not be found.
     */
    readonly markMessageAsDeleted: ControllerUpdateFromSource<[uid: MessageId, deletedAt: Date]>;

    /**
     * Create a status message and add it to the DB.
     * The status message can be of any type.
     * Status are triggered locally and do not have side-effects on linked devices.
     *
     * Note: This triggers an update of the `_lastModificationStore`.
     */
    readonly createStatusMessage: <TType extends StatusMessageType>(
        statusMessage: Omit<StatusMessageView<TType>, 'conversationUid' | 'id' | 'ordinal'>,
    ) => AnyStatusMessageModelStore;

    /**
     * Return whether the message with the specified id exists in the this conversation.
     */
    readonly hasMessage: (id: MessageId) => boolean;

    /**
     * Return a {@link ModelStore} of the message with the specified id.
     */
    readonly getMessage: (id: MessageId) => AnyMessageModelStore | undefined;

    /**
     * Return a {@link ModelStore} of every message in the current conversation.
     */
    readonly getAllMessages: () => SetOfAnyLocalMessageModelStore;

    /**
     * Return a {@link ModelStore} for every (status) message in {@link anyMessageIds}, plus a
     * number of additional older and newer (status) messages (the "context").
     *
     * @param anyMessageIds The reference (status) message IDs.
     * @param contextSize The maximum number of the sum of messages and status messages to load for
     *   each direction where the maximum number of loaded messages for both status and normal
     *   messages is the same (i.e int(`contextSize` / 2)). Example: If `contextSize` is 20 and the
     *   last message ID is the only entry in {@link anyMessageIds}, then at most 10 messages and 10
     *   status messages will be returned. If `contextSize` is 50 and 5 messages in the middle of
     *   the conversation are part of {@link anyMessageIds}, then at most 50 messages and 50 status
     *   messages + the five message in the middle (no matter if they are status or normal messages)
     *   will be returned.
     */
    readonly getMessagesWithSurroundingMessages: (
        anyMessageIds: ReadonlySet<MessageId | StatusMessageId>,
        contextSize: u53,
    ) => Set<AnyMessageModelStore | AnyStatusMessageModelStore>;

    /**
     * Retrieves all status messages of this conversation from the DB and creates the corresponding
     * {@link ModelStore}s.
     */
    readonly getAllStatusMessages: () => IDerivableSetStore<AnyStatusMessageModelStore>;

    /**
     *
     * @returns The number of messages in this conversation
     */
    readonly getMessageCount: () => u53;

    /**
     * Return id of the first (i.e. oldest) unread message, or `undefined` if all messages in the
     * conversation have been read.
     */
    readonly getFirstUnreadMessageId: () => MessageId | undefined;

    /**
     * The user read (i.e. opened) the conversation on the current device.
     */
    readonly read: ControllerUpdateFromLocal<[readAt: Date]>;
} & ProxyMarked;
export interface ConversationControllerHandle {
    /**
     * UID of the conversation.
     */
    readonly uid: UidOf<DbConversation>;

    /**
     * Receiver associated with the conversation.
     */
    readonly receiverLookup: DbReceiverLookup;

    /**
     * Return the {@link ConversationId} for the current conversation.
     */
    readonly conversationId: () => ConversationId;

    /**
     * Decrement the unread message count of the conversation.
     *
     * The unread message count will be decremented by the specified amount. Note that the unread
     * message count can never go below 0.
     */
    readonly decrementUnreadMessageCount: () => void;

    /**
     * Return the receiver model store of this conversation.
     */
    readonly getReceiver: () => AnyReceiverStore;
}
export type Conversation = Model<ConversationView, ConversationController, UidOf<DbConversation>>;
export type ConversationListController = {
    readonly lifetimeGuard: ModelLifetimeGuard<readonly ModelStore<Conversation>[]>;
} & ProxyMarked;

export type ConversationRepository = {
    readonly totalUnreadMessageCount: LocalStore<u53>;
    getAll: () => LocalSetStore<ModelStore<Conversation>>;
    getByUid: (uid: DbConversationUid) => ModelStore<Conversation> | undefined;
    getForReceiver: (receiver: DbReceiverLookup) => ModelStore<Conversation> | undefined;
    /**
     * Clears the conversation cache and reloads all conversations, triggering a full refresh of the
     * frontend main view.
     */
    refreshCache: () => void;
} & ProxyMarked;
