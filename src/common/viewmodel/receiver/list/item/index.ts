import type {AnyReceiver} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ReceiverListItemViewModelController,
    type IReceiverListItemViewModelController,
} from '~/common/viewmodel/receiver/list/item/controller';
import {
    getReceiverListItemViewModelStore,
    type ReceiverListItemViewModelStore,
} from '~/common/viewmodel/receiver/list/item/store';

export interface ReceiverListItemViewModelBundle<TReceiver extends AnyReceiver>
    extends PropertiesMarked {
    readonly viewModelController: IReceiverListItemViewModelController<TReceiver>;
    readonly viewModelStore: ReceiverListItemViewModelStore<TReceiver>;
}

export function getReceiverListItemViewModelBundle<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<TReceiver>,
): ReceiverListItemViewModelBundle<TReceiver> {
    const {endpoint} = services;

    const viewModelController = new ReceiverListItemViewModelController(receiverModelStore.get());
    const viewModelStore = getReceiverListItemViewModelStore<TReceiver>(
        services,
        receiverModelStore,
    );

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
