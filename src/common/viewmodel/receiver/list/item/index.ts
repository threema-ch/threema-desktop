import type {AnyReceiver} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ContactListItemViewModelController,
    type IContactListItemViewModelController,
} from '~/common/viewmodel/contact/list/item/controller';
import {
    getContactListItemViewModelStore,
    type ContactListItemViewModelStore,
} from '~/common/viewmodel/contact/list/item/store';

export interface ContactListItemViewModelBundle<TReceiver extends AnyReceiver>
    extends PropertiesMarked {
    readonly viewModelController: IContactListItemViewModelController<TReceiver>;
    readonly viewModelStore: ContactListItemViewModelStore<TReceiver>;
}

export function getContactListItemViewModelBundle<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<TReceiver>,
): ContactListItemViewModelBundle<TReceiver> {
    const {endpoint} = services;

    const viewModelController = new ContactListItemViewModelController(receiverModelStore.get());
    const viewModelStore = getContactListItemViewModelStore<TReceiver>(
        services,
        receiverModelStore,
    );

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
