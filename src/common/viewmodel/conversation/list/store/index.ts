import type {PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore, WritableStore} from '~/common/utils/store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import {getConversationListItemSetStore} from '~/common/viewmodel/conversation/list/store/helpers';
import type {ConversationListViewModel} from '~/common/viewmodel/conversation/list/store/types';

export type ConversationListViewModelStore = LocalStore<
    ConversationListViewModel & PropertiesMarked
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
