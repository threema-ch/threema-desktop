import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationListViewModel} from '~/common/viewmodel/conversation/list/store/types';

/**
 * Returns a {@link ConversationListItemSetStore} containing
 * {@link ConversationListItemViewModelBundle}s of all conversations.
 */
export function getConversationListItemSetStore(
    services: Pick<ServicesForViewModel, 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ConversationListViewModel['listItemSetStore'] {
    const {logging, model} = services;

    // Options for all derived stores below.
    const tag = `conversation.list.item[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`viewmodel.${tag}`),
            tag,
        },
    };

    const conversationSetStore = model.conversations.getAll();

    // Fetch the `ConversationListItemViewModelBundle` for every conversation in the set store.
    const conversationListItemSetStore = new LocalDerivedSetStore(
        conversationSetStore,
        (conversationModelStore) =>
            viewModelRepository.conversationListItem(conversationModelStore),
        storeOptions,
    );

    return conversationListItemSetStore;
}
