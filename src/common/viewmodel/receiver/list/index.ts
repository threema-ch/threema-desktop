import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import {
    getReceiverListViewModelStore,
    type ReceiverListViewModelStore,
} from '~/common/viewmodel/receiver/list/store';

export interface ReceiverListViewModelBundle extends PropertiesMarked {
    readonly viewModelStore: ReceiverListViewModelStore;
}

export function getReceiverListViewModelBundle(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
): ReceiverListViewModelBundle {
    const {endpoint} = services;

    const viewModelStore = getReceiverListViewModelStore(services, viewModelRepository);

    return endpoint.exposeProperties({
        viewModelStore,
    });
}
