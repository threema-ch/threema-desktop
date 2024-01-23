import type {DbConversationUid} from '~/common/db';
import type {ConversationCategory, MessageDirection} from '~/common/enum';
import type {FEATURE_MASK_FLAG, MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation/main/store';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ConversationViewProps` that the conversation view component expects, excluding
 * props that only exist in the ui layer.
 */
export interface ConversationViewModel {
    readonly category: ConversationCategory;
    /**
     * The `MessageId` of the first (i.e. earliest) message that is still unread in the conversation.
     */
    readonly firstUnreadMessageId: MessageId | undefined;
    readonly id: DbConversationUid;
    readonly isArchived: boolean;
    readonly isPinned: boolean;
    readonly isPrivate: boolean;
    readonly lastMessage:
        | {
              readonly id: MessageId;
              readonly direction: MessageDirection;
          }
        | undefined;
    readonly messageSetStore: ConversationMessageSetStore;
    readonly receiver: AnyReceiverData;
    readonly totalMessagesCount: u53;
    readonly unreadMessagesCount: u53;
    readonly supportedFeatures: FeatureMaskMap;
}

/**
 * A map from supported feature masks to names that do not support them
 * so that they can be displayed accordingly in the frontend.
 */
export type FeatureMaskMap = Map<
    (typeof FEATURE_MASK_FLAG)[keyof typeof FEATURE_MASK_FLAG],
    {notSupported: string[]}
>;
