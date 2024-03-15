import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore, WritableStore} from '~/common/utils/store';
import type {IDerivableSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';
import {getConversationListItemSetStore} from '~/common/viewmodel/conversation/list/store/helpers';
import type {ConversationListViewModel} from '~/common/viewmodel/conversation/list/store/types';

export type ConversationListViewModelStore = LocalStore<
    ConversationListViewModel & PropertiesMarked
>;

/**
 * {@link SetStore} containing the {@link ConversationListItemViewModelBundle}s of all
 * conversations.
 */
export type ConversationListItemSetStore = LocalDerivedSetStore<
    IDerivableSetStore<ConversationModelStore>,
    ConversationListItemViewModelBundle
>;

export function getConversationListViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ConversationListViewModelStore {
    const {endpoint} = services;

    const conversationListItemSetStore = getConversationListItemSetStore(
        services,
        viewModelRepository,
    );

    const conversationListViewModel: ConversationListViewModel = {
        listItemSetStore: conversationListItemSetStore,
    };

    return new WritableStore(endpoint.exposeProperties({...conversationListViewModel}));
}
