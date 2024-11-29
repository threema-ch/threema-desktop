import type {BackendController} from '~/common/dom/backend/controller';
import type {
    AppearanceSettingsView,
    CallsSettingsView,
    ChatSettingsView,
    DevicesSettingsView,
    MediaSettingsView,
    PrivacySettingsView,
    ProfileSettingsView,
} from '~/common/model/types/settings';
import type {Settings} from '~/common/settings';
import {assertUnreachable, unreachable} from '~/common/utils/assert';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {SettingsPageUpdate} from '~/common/viewmodel/settings/controller/types';

/**
 * Access and update the settings from anywhere in the application without direct access to the
 * underlying models. This is an extension to the {@link SettingsViewModel} for accesses outside of
 * the settings panel.
 */
export interface SettingsServiceData extends Record<keyof Settings, unknown> {
    readonly appearance: IQueryableStore<AppearanceSettingsView>;
    readonly calls: IQueryableStore<CallsSettingsView>;
    readonly chat: IQueryableStore<ChatSettingsView>;
    readonly devices: IQueryableStore<DevicesSettingsView>;
    readonly media: IQueryableStore<MediaSettingsView>;
    readonly privacy: IQueryableStore<PrivacySettingsView>;
    readonly profile: IQueryableStore<Omit<ProfileSettingsView, 'profilePicture'>>;
}

/**
 * This service is in structure and functionality very similar to the {@link SettingsViewModel} and
 * can be used to access and update the settings from anywhere in the frontend.
 */
export class SettingsService {
    public constructor(
        private readonly _services: Pick<BackendController, 'model'>,
        public readonly views: SettingsServiceData,
    ) {}

    public static async create(backend: BackendController): Promise<SettingsService> {
        const [
            remoteAppearanceSettings,
            remoteCallsSettings,
            remoteChatSettings,
            remoteDevicesSettings,
            remoteMediaSettings,
            remotePrivacySettings,
            remoteProfileSettings,
        ] = await Promise.all([
            backend.model.user.appearanceSettings,
            backend.model.user.callsSettings,
            backend.model.user.chatSettings,
            backend.model.user.devicesSettings,
            backend.model.user.mediaSettings,
            backend.model.user.privacySettings,
            backend.model.user.profileSettings,
        ]);

        const views: SettingsServiceData = {
            appearance: derive(
                [remoteAppearanceSettings],
                ([{currentValue: newValue}]) => newValue.view,
            ),
            calls: derive([remoteCallsSettings], ([{currentValue: newValue}]) => newValue.view),
            chat: derive([remoteChatSettings], ([{currentValue: newValue}]) => newValue.view),
            devices: derive([remoteDevicesSettings], ([{currentValue: newValue}]) => newValue.view),
            media: derive([remoteMediaSettings], ([{currentValue: newValue}]) => newValue.view),
            privacy: derive([remotePrivacySettings], ([{currentValue: newValue}]) => newValue.view),
            profile: derive([remoteProfileSettings], ([{currentValue: newValue}]) => newValue.view),
        };

        return new SettingsService(backend, views);
    }

    /**
     * Updates the settings in the backend with the given values.
     */
    public async update(settingsUpdate: SettingsPageUpdate): Promise<void> {
        const {user} = this._services.model;

        switch (settingsUpdate.type) {
            case 'appearance':
                (await user.appearanceSettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            case 'calls':
                (await user.callsSettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            case 'chat':
                (await user.chatSettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            case 'devices':
                (await user.devicesSettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            case 'media':
                (await user.mediaSettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            case 'privacy':
                (await user.privacySettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            case 'profile':
                (await user.profileSettings)
                    .get()
                    .controller.update(settingsUpdate.update)
                    .catch(assertUnreachable);
                break;
            default:
                unreachable(settingsUpdate);
        }
    }
}
