import type {PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore, WritableStore} from '~/common/utils/store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import {
    getContactListItemSetStore,
    getGroupContactListItemSetStore,
} from '~/common/viewmodel/contact/list/store/helpers';
import type {ContactListViewModel} from '~/common/viewmodel/contact/list/store/types';

export type ContactListViewModelStore = LocalStore<ContactListViewModel & PropertiesMarked>;

export function getContactListViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ContactListViewModelStore {
    const {endpoint} = services;

    const contactListViewModel: ContactListViewModel = {
        contactListItemSetStore: getContactListItemSetStore(services, viewModelRepository),
        groupContactListItemSetStore: getGroupContactListItemSetStore(
            services,
            viewModelRepository,
        ),
    };

    return new WritableStore(endpoint.exposeProperties({...contactListViewModel}));
}
