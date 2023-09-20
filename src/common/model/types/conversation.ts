import type {DbConversation, DbReceiverLookup, UidOf} from '~/common/db';
import type {
    ConversationCategory,
    ConversationVisibility,
    MessageDirection,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import type {
    ControllerCustomUpdateFromSource,
    ControllerUpdateFromLocal,
    LocalModel,
} from '~/common/model/types/common';
import type {
    AnyMessageModelStore,
    DirectedMessageFor,
    SetOfAnyLocalMessageModelStore,
} from '~/common/model/types/message';
import type {AnyReceiverStore} from '~/common/model/types/receiver';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {ConversationId, MessageId} from '~/common/network/types';
import type {i53, u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import type {LocalSetStore} from '~/common/utils/store/set-store';

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
}
export type ConversationInit = Omit<ConversationView, 'type'>;
export type ConversationUpdate = Partial<Omit<ConversationView, 'unreadMessageCount' | 'type'>>;
/**
 * Conversation update that may be processed from/to the other devices to/from the local device via D2D sync.
 */
export type ConversationUpdateFromToSync = Pick<ConversationUpdate, 'category' | 'visibility'>;
export type ConversationController = {
    readonly uid: UidOf<DbConversation>;
    readonly meta: ModelLifetimeGuard<ConversationView>;
    readonly receiver: () => AnyReceiverStore;
    readonly lastMessageStore: () => LocalStore<AnyMessageModelStore | undefined>;
    /**
     * Update a conversation.
     *
     * If {@link unreadMessageCountDelta} is set, the unread message count will be incremented or
     * decremented by the specified amount. Note that the unread message count can never go below 0.
     */
    readonly update: (change: ConversationUpdate, unreadMessageCountDelta?: i53) => void;
    /**
     * Add a new message to this conversation.
     *
     * The message will be stored in the database. If `source` is `TriggerSource.LOCAL`, the
     * outgoing message task will be triggered.
     */
    readonly addMessage: ControllerCustomUpdateFromSource<
        [init: DirectedMessageFor<MessageDirection.OUTBOUND, MessageType, 'init'>],
        [init: DirectedMessageFor<MessageDirection, MessageType, 'init'>],
        [init: DirectedMessageFor<MessageDirection.INBOUND, MessageType, 'init'>],
        AnyMessageModelStore
    >;
    /**
     * Remove a message from this conversation.
     *
     * The message will be only removed from the device where the action is executed. I.e. this
     * action is not reflected.
     */
    readonly removeMessage: ControllerUpdateFromLocal<[uid: MessageId]>;
    /**
     * Remove all message from this conversation, i.e. empty the conversation.
     *
     * The messages will be only removed from the device where the action is executed. I.e. this
     * action is not reflected.
     */
    readonly removeAllMessages: ControllerUpdateFromLocal;
    /**
     * Return whether the message with the specified id exists in the this conversation.
     */
    readonly hasMessage: (id: MessageId) => boolean;
    /**
     * Return a {@link LocalModelStore} of the message with the specified id.
     */
    readonly getMessage: (id: MessageId) => AnyMessageModelStore | undefined;
    /**
     * Return a {@link LocalModelStore} of every message in the current conversation.
     */
    readonly getAllMessages: () => SetOfAnyLocalMessageModelStore;
    /**
     * Return a {@link LocalModelStore} for every message in the current conversation with a certain
     * range around a reference message.
     */
    readonly getMessageWithSurroundingMessages: (
        id: MessageId,
        contextSize: u53,
    ) => Set<AnyMessageModelStore> | undefined;
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
     * Update the conversation.
     *
     * If {@link unreadMessageCountDelta} is set, the unread message count will be incremented or
     * decremented by the specified amount. Note that the unread message count can never go below 0.
     *
     * Note: This implicitly adds the conversation to the conversation list, so it should not be
     *       called before a commitment to the conversation has been made (e.g. a message is being
     *       sent or has been received).
     */
    readonly update: (
        change: Required<Pick<ConversationUpdate, 'lastUpdate'>> & ConversationUpdate,
        unreadMessageCountDelta?: i53,
    ) => void;

    /**
     * Decrement the unread message count of the conversation.
     *
     * The unread message count will be decremented by the specified amount. Note that the unread
     * message count can never go below 0.
     */
    readonly decrementUnreadMessageCount: () => void;
}
export type Conversation = LocalModel<
    ConversationView,
    ConversationController,
    UidOf<DbConversation>
>;
export type ConversationListController = {
    readonly meta: ModelLifetimeGuard<readonly LocalModelStore<Conversation>[]>;
} & ProxyMarked;

export type ConversationRepository = {
    readonly totalUnreadMessageCount: LocalStore<u53>;
    getForReceiver: (receiver: DbReceiverLookup) => LocalModelStore<Conversation> | undefined;
    getAll: () => LocalSetStore<LocalModelStore<Conversation>>;
} & ProxyMarked;
