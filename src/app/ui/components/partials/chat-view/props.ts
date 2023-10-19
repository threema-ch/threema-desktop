import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {DbConversationUid, DbReceiverLookup} from '~/common/db';
import type {MessageDirection} from '~/common/enum';
import type {MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {Remote} from '~/common/utils/endpoint';
import type {ConversationMessageSetViewModel} from '~/common/viewmodel/conversation-message-set';

/**
 * Props accepted by the `ChatView` component.
 */
export interface ChatViewProps {
    /** Details about the conversation. */
    readonly conversation: MessageProps['conversation'] & {
        readonly firstUnreadMessageId: MessageId | undefined;
        readonly id: DbConversationUid;
        readonly lastMessage:
            | {
                  readonly id: MessageProps['id'];
                  readonly direction: MessageDirection;
              }
            | undefined;
        readonly markAllMessagesAsRead: () => void;
        readonly receiverLookup: DbReceiverLookup;
        readonly unreadMessagesCount: u53;
    };
    /** ViewModel of the set of messages belonging to this conversation. */
    readonly messageSetViewModel: Remote<ConversationMessageSetViewModel>;
    /** `AppServices` bundle to pass through to child components. */
    readonly services: AppServices;
}
