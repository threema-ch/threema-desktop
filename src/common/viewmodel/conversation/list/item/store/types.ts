import type {ConversationCategory, ConversationVisibility} from '~/common/enum';
import type {u53} from '~/common/types';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {AnyCallData} from '~/common/viewmodel/utils/call';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ConversationListItemProps` that the conversation list item component expects,
 * excluding props that only exist in the ui layer.
 */
export interface ConversationListItemViewModel {
    readonly category: ConversationCategory;
    readonly call: AnyCallData | undefined;
    readonly lastMessage: ConversationRegularMessageViewModelBundle | undefined;
    readonly lastUpdate: Date | undefined;
    readonly receiver: AnyReceiverData;
    readonly totalMessageCount: u53;
    readonly unreadMessageCount: u53;
    readonly visibility: ConversationVisibility;
}
