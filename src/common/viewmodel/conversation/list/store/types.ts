import type {ConversationListItemSetStore} from '~/common/viewmodel/conversation/list/store';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ConversationListProps` that the conversation list component expects, excluding
 * props that only exist in the ui layer.
 */
export interface ConversationListViewModel {
    readonly listItemSetStore: ConversationListItemSetStore;
}
