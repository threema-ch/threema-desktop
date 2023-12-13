import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {DbConversationUid} from '~/common/db';
import type {MessageDirection} from '~/common/enum';
import type {MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {Remote} from '~/common/utils/endpoint';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation/main/store';

/**
 * Props accepted by the `ChatView` component.
 */
export interface ChatViewProps {
    /** Details about the conversation. */
    readonly conversation: MessageProps['conversation'] & {
        /**
         * The `MessageId` of the first (i.e. earliest) message that is still unread in the
         * conversation. Note: The `ChatView` will make sure this message is visible when the
         * conversation is first loaded in the `ChatView`.
         */
        readonly firstUnreadMessageId: MessageId | undefined;
        readonly id: DbConversationUid;
        readonly lastMessage:
            | {
                  readonly id: MessageProps['id'];
                  readonly direction: MessageDirection;
              }
            | undefined;
        readonly markAllMessagesAsRead: () => void;
        readonly setCurrentViewportMessages: (ids: Set<MessageId>) => Promise<unknown>;
        readonly unreadMessagesCount: u53;
    };
    /** ViewModel of the set of messages belonging to this conversation. */
    readonly messageSetStore: Remote<ConversationMessageSetStore>;
    /** `AppServices` bundle to pass through to child components. */
    readonly services: AppServices;
}
