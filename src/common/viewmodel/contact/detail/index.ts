import type {AnyReceiver} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ContactDetailViewModelController,
    type IContactDetailViewModelController,
} from '~/common/viewmodel/contact/detail/controller';
import {
    getContactDetailViewModelStore,
    type ContactDetailViewModelStore,
} from '~/common/viewmodel/contact/detail/store';

export interface ContactDetailViewModelBundle<TReceiver extends AnyReceiver>
    extends PropertiesMarked {
    readonly viewModelController: IContactDetailViewModelController<TReceiver>;
    readonly viewModelStore: ContactDetailViewModelStore<TReceiver>;
}

export function getContactDetailViewModelBundle<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<TReceiver>,
): ContactDetailViewModelBundle<TReceiver> {
    const {endpoint} = services;

    const viewModelController = new ContactDetailViewModelController(receiverModelStore.get());
    const viewModelStore = getContactDetailViewModelStore<TReceiver>(services, receiverModelStore);

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
