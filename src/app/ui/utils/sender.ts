import type {MessageSender} from '~/app/ui/components/partials/conversation/internal/message-list/types';
import type {Remote} from '~/common/utils/endpoint';
import type {AnyConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/helpers';
import type {ConversationStatusMessageViewModelStore} from '~/common/viewmodel/conversation/main/message/status-message/store';

/**
 * Transform {@link MessageSenderData} to {@link MessageSender}.
 */
export function transformMessageSenderProps(
    viewModel: ReturnType<
        Remote<
            Exclude<
                AnyConversationMessageViewModelBundle['viewModelStore'],
                ConversationStatusMessageViewModelStore
            >
        >['get']
    >,
): MessageSender {
    return viewModel.sender.type === 'contact'
        ? {
              ...viewModel.sender,
              type: 'contact',
              uid: viewModel.sender.lookup.uid,
          }
        : {...viewModel.sender, type: 'self'};
}
