import type {MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {
    DeprecatedAnySenderData,
    MessageStatusData,
} from '~/common/viewmodel/conversation/main/message/helpers';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `DeletedMessageProps` that the message component expects, excluding props that
 * only exist in the ui layer.
 */
export interface ConversationDeletedMessageViewModel {
    readonly type: 'deleted-message';
    readonly direction: 'inbound' | 'outbound';
    readonly id: MessageId;
    /**
     * Ordinal for message ordering in the conversation list.
     */
    readonly ordinal: u53;
    readonly sender?: DeprecatedAnySenderData;
    readonly status: MessageStatusData;
}
