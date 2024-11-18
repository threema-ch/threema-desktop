import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getProfileSettingsData} from '~/common/viewmodel/settings/store/helpers';
import type {SettingsViewModel} from '~/common/viewmodel/settings/store/types';

export type SettingsViewModelStore = LocalStore<SettingsViewModel & PropertiesMarked>;

export function getSettingsViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
): SettingsViewModelStore {
    const {user} = services.model;
    return derive(
        [
            user.appearanceSettings,
            user.callsSettings,
            user.chatSettings,
            user.devicesSettings,
            user.mediaSettings,
            user.privacySettings,
            user.profileSettings,
        ],
        ([
            {currentValue: appearanceSettings},
            {currentValue: callsSettings},
            {currentValue: chatSettings},
            {currentValue: devicesSettings},
            {currentValue: mediaSettings},
            {currentValue: privacySettings},
            {currentValue: profileSettings},
        ]) =>
            services.endpoint.exposeProperties({
                appearance: appearanceSettings.view,
                calls: callsSettings.view,
                chat: chatSettings.view,
                devices: devicesSettings.view,
                media: mediaSettings.view,
                privacy: privacySettings.view,
                profile: getProfileSettingsData(profileSettings.view),
            }),
    );
}
