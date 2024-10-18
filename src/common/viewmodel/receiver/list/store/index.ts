import type {PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore, WritableStore} from '~/common/utils/store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import {
    getContactListItemSetStore,
    getGroupListItemSetStore,
} from '~/common/viewmodel/receiver/list/store/helpers';
import type {ReceiverListViewModel} from '~/common/viewmodel/receiver/list/store/types';

export type ReceiverListViewModelStore = LocalStore<ReceiverListViewModel & PropertiesMarked>;

export function getReceiverListViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ReceiverListViewModelStore {
    const {endpoint} = services;

    const receiverListViewModel: ReceiverListViewModel = {
        contactListItemSetStore: getContactListItemSetStore(services, viewModelRepository),
        groupContactListItemSetStore: getGroupListItemSetStore(services, viewModelRepository),
    };

    return new WritableStore(endpoint.exposeProperties({...receiverListViewModel}));
}
