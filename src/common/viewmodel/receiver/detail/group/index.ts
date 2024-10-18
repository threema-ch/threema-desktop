import type {Group} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    GroupDetailViewModelController,
    type IGroupDetailViewModelController,
} from '~/common/viewmodel/receiver/detail/group/controller';
import {
    getGroupDetailViewModelStore,
    type GroupDetailViewModelStore,
} from '~/common/viewmodel/receiver/detail/group/store';

export interface GroupDetailViewModelBundle extends PropertiesMarked {
    readonly viewModelController: IGroupDetailViewModelController;
    readonly viewModelStore: GroupDetailViewModelStore;
}

export function getGroupDetailViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    groupModelStore: ModelStore<Group>,
): GroupDetailViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new GroupDetailViewModelController(services, groupModelStore.get());
    const viewModelStore = getGroupDetailViewModelStore(services, groupModelStore);

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
