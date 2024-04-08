import type {AnyReceiver} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ContactListItemViewModel} from '~/common/viewmodel/contact/list/item/store/types';
import {getReceiverData} from '~/common/viewmodel/utils/receiver';

export type ContactListItemViewModelStore<TReceiver extends AnyReceiver> = LocalStore<
    ContactListItemViewModel<TReceiver> & PropertiesMarked
>;

export function getContactListItemViewModelStore<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<TReceiver>,
): ContactListItemViewModelStore<TReceiver> {
    const {endpoint} = services;

    return derive([receiverModelStore], ([{currentValue: receiverModel}], getAndSubscribe) => {
        const contactListItemViewModel: ContactListItemViewModel<TReceiver> = {
            receiver: getReceiverData<TReceiver>(
                services,
                receiverModel as TReceiver,
                getAndSubscribe,
            ),
        };

        return endpoint.exposeProperties({
            ...contactListItemViewModel,
        });
    });
}
