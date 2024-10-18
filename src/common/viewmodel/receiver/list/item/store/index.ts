import type {AnyReceiver} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ReceiverListItemViewModel} from '~/common/viewmodel/receiver/list/item/store/types';
import {getReceiverData} from '~/common/viewmodel/utils/receiver';

export type ReceiverListItemViewModelStore<TReceiver extends AnyReceiver> = LocalStore<
    ReceiverListItemViewModel<TReceiver> & PropertiesMarked
>;

export function getReceiverListItemViewModelStore<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<TReceiver>,
): ReceiverListItemViewModelStore<TReceiver> {
    const {endpoint} = services;

    return derive([receiverModelStore], ([{currentValue: receiverModel}], getAndSubscribe) => {
        const receiverListItemViewModel: ReceiverListItemViewModel<TReceiver> = {
            receiver: getReceiverData<TReceiver>(
                services,
                receiverModel as TReceiver,
                getAndSubscribe,
            ),
        };

        return endpoint.exposeProperties({
            ...receiverListItemViewModel,
        });
    });
}
