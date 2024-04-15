import type {AnyReceiver} from '~/common/model';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ContactDetailViewModel} from '~/common/viewmodel/contact/detail/store/types';
import {getReceiverData, getSelfReceiverData} from '~/common/viewmodel/utils/receiver';

export type ContactDetailViewModelStore<TReceiver extends AnyReceiver> = LocalStore<
    ContactDetailViewModel<TReceiver> & PropertiesMarked
>;

export function getContactDetailViewModelStore<TReceiver extends AnyReceiver>(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    receiverModelStore: ReceiverStoreFor<TReceiver>,
): ContactDetailViewModelStore<TReceiver> {
    const {endpoint} = services;

    return derive([receiverModelStore], ([{currentValue: receiverModel}], getAndSubscribe) => {
        const contactDetailViewModel: ContactDetailViewModel<TReceiver> = {
            receiver: getReceiverData<TReceiver>(
                services,
                receiverModel as TReceiver,
                getAndSubscribe,
            ),
            user: getSelfReceiverData(services, getAndSubscribe),
        };

        return endpoint.exposeProperties({
            ...contactDetailViewModel,
        });
    });
}
