import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import {
    getContactListViewModelStore,
    type ContactListViewModelStore,
} from '~/common/viewmodel/contact/list/store';

export interface ContactListViewModelBundle extends PropertiesMarked {
    readonly viewModelStore: ContactListViewModelStore;
}

export function getContactListViewModelBundle(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
): ContactListViewModelBundle {
    const {endpoint} = services;

    const viewModelStore = getContactListViewModelStore(services, viewModelRepository);

    return endpoint.exposeProperties({
        viewModelStore,
    });
}
