import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    SettingsViewModelController,
    type ISettingsViewModelController,
} from '~/common/viewmodel/settings/controller';

export interface SettingsViewModelBundle extends PropertiesMarked {
    readonly viewModelController: ISettingsViewModelController;
}

export function getSettingsViewModelBundle(
    services: ServicesForViewModel,
): SettingsViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new SettingsViewModelController(services);

    return endpoint.exposeProperties({
        viewModelController,
    });
}
