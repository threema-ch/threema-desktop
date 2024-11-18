import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    SettingsViewModelController,
    type ISettingsViewModelController,
} from '~/common/viewmodel/settings/controller';
import {
    getSettingsViewModelStore,
    type SettingsViewModelStore,
} from '~/common/viewmodel/settings/store';

export interface SettingsViewModelBundle extends PropertiesMarked {
    readonly viewModelController: ISettingsViewModelController;
    readonly viewModelStore: SettingsViewModelStore;
}

export function getSettingsViewModelBundle(
    services: ServicesForViewModel,
): SettingsViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new SettingsViewModelController(services);

    const viewModelStore = getSettingsViewModelStore(services);

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
