import type {ConversationModelStore} from '~/common/model/conversation';
import type {IDerivableSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ConversationListProps` that the conversation list component expects, excluding
 * props that only exist in the ui layer.
 */
export interface ConversationListViewModel {
    readonly listItemSetStore: ConversationListItemSetStore;
}

/**
 * {@link SetStore} containing the {@link ConversationListItemViewModelBundle}s of all
 * conversations.
 */
type ConversationListItemSetStore = LocalDerivedSetStore<
    IDerivableSetStore<ConversationModelStore>,
    ConversationListItemViewModelBundle
>;
