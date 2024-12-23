import type {AppServicesForSvelte} from '~/app/types';
import type {DeletedMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/deleted-message/props';
import type {MessageDetailsModalProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-details-modal/props';
import type {RegularMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/props';
import type {StatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/props';
import type {DbConversationUid} from '~/common/db';
import type {MessageDirection} from '~/common/enum';
import type {MessageId, StatusMessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {IQueryableStore} from '~/common/utils/store';

/**
 * Props accepted by the `MessageList` component.
 */
export interface MessageListProps {
    /** Details about the conversation. */
    readonly conversation: RegularMessageProps['conversation'] & {
        /**
         * The `MessageId` of the first (i.e. earliest) message that is still unread in the
         * conversation. Note: The `MessageList` will make sure this message is visible when the
         * conversation is first loaded in the `MessageList`.
         */
        readonly firstUnreadMessageId: MessageId | undefined;
        readonly id: DbConversationUid;
        /**
         * The `MessageId` to bring into view when initially loading the conversation. Note: If not
         * defined, the `firstUnreadMessageId` will be used instead, or the `lastMessage`.
         */
        readonly initiallyVisibleMessageId?: MessageId;
        readonly isTyping: boolean;
        readonly lastMessage:
            | {
                  readonly id: AnyMessageListMessage['id'];
                  readonly direction: MessageDirection | 'none';
              }
            | undefined;
        readonly markAllMessagesAsRead: () => void;
        readonly setCurrentViewportMessages: (
            ids: Set<MessageId | StatusMessageId>,
        ) => Promise<unknown>;
        readonly unreadMessagesCount: u53;
    };
    /** Store of messages belonging to this conversation. */
    readonly messagesStore: IQueryableStore<AnyMessageListMessage[]>;
    /** `AppServicesForSvelte` bundle to pass through to child components. */
    readonly services: AppServicesForSvelte;
}

/**
 * Union of single message types that are part of a `MessageList`.
 */
export type AnyMessageListMessage =
    | MessageListRegularMessage
    | MessageListDeletedMessage
    | MessageListStatusMessage;

/**
 * Type of a deleted message that is part of a `MessageList`.
 */
export interface MessageListDeletedMessage
    extends Omit<DeletedMessageProps, 'boundary' | 'conversation' | 'services'> {
    readonly type: 'deleted-message';
    readonly id: MessageId;
}

/**
 * Type of a regular message that is part of a `MessageList`.
 */
export interface MessageListRegularMessage
    extends Omit<RegularMessageProps, 'boundary' | 'conversation' | 'services'> {
    readonly type: 'regular-message';
    readonly history: MessageDetailsModalProps['history'];
}

/**
 * Type of a status message that is part of a `MessageList`.
 */
export interface MessageListStatusMessage extends Omit<StatusMessageProps, 'boundary'> {
    readonly type: 'status-message';
    readonly created: {
        readonly at: Date;
    };
    readonly id: StatusMessageId;
}
