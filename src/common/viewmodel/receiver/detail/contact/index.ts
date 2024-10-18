import type {Contact} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ContactDetailViewModelController,
    type IContactDetailViewModelController,
} from '~/common/viewmodel/receiver/detail/contact/controller';
import {
    getContactDetailViewModelStore,
    type ContactDetailViewModelStore,
} from '~/common/viewmodel/receiver/detail/contact/store';

export interface ContactDetailViewModelBundle extends PropertiesMarked {
    readonly viewModelController: IContactDetailViewModelController;
    readonly viewModelStore: ContactDetailViewModelStore;
}

export function getContactDetailViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<Contact>,
): ContactDetailViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new ContactDetailViewModelController(receiverModelStore.get());
    const viewModelStore = getContactDetailViewModelStore(services, receiverModelStore);

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
