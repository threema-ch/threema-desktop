import type {Group} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {GroupDetailViewModel} from '~/common/viewmodel/receiver/detail/group/store/types';
import {getReceiverData, getSelfReceiverData} from '~/common/viewmodel/utils/receiver';

export type GroupDetailViewModelStore = LocalStore<GroupDetailViewModel & PropertiesMarked>;

export function getGroupDetailViewModelStore(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    groupModelStore: ModelStore<Group>,
): GroupDetailViewModelStore {
    const {endpoint} = services;

    return derive([groupModelStore], ([{currentValue: groupModel}], getAndSubscribe) => {
        const groupDetailViewModel: GroupDetailViewModel = {
            receiver: getReceiverData(services, groupModel, getAndSubscribe),
            user: getSelfReceiverData(services, getAndSubscribe),
        };

        return endpoint.exposeProperties({
            ...groupDetailViewModel,
        });
    });
}
