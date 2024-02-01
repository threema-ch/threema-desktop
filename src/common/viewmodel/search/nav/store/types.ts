import type {ConversationCategory, ConversationVisibility} from '~/common/enum';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalSetStore} from '~/common/utils/store/set-store';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `SearchViewProps` that the search view component expects, excluding props that
 * only exist in the ui layer.
 */
export interface SearchViewModel {
    readonly conversationSearchResults: LocalSetStore<ConversationSearchResult>;
    readonly messageSearchResults: LocalSetStore<MessageSearchResult>;
    readonly receiverSearchResults: LocalSetStore<ReceiverSearchResult>;
}

/**
 * Data of a single conversation search result.
 */
export interface ConversationSearchResult extends PropertiesMarked {
    readonly category: ConversationCategory;
    readonly lastMessage: ConversationMessageViewModelBundle | undefined;
    readonly lastUpdate: Date | undefined;
    readonly receiver: AnyReceiverData;
    readonly visibility: ConversationVisibility;
}

/**
 * Data of a single message search result.
 */
export interface MessageSearchResult extends PropertiesMarked {
    readonly conversation: {
        readonly receiver: Pick<AnyReceiverData, 'color' | 'initials' | 'name' | 'lookup' | 'type'>;
    };
    readonly message: ConversationMessageViewModelBundle;
}

/**
 * Data of a single receiver search result.
 */
export interface ReceiverSearchResult extends PropertiesMarked {
    readonly receiver: AnyReceiverData;
}
