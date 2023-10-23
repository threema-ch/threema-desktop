import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {Remote} from '~/common/utils/endpoint';
import type {ConversationMessageSetViewModel} from '~/common/viewmodel/conversation-message-set';

/**
 * Props accepted by the `ChatView` component.
 */
export interface ChatViewProps {
    /** Details about the conversation. */
    readonly conversation: MessageProps['conversation'];
    /** ViewModel of the set of messages belonging to this conversation. */
    readonly messageSetViewModel: Remote<ConversationMessageSetViewModel>;
    /** `AppServices` bundle to pass through to child components. */
    readonly services: AppServices;
}
