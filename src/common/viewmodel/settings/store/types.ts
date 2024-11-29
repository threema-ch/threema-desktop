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

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the values needed by each settings page.
 */
export interface SettingsViewModel extends Record<keyof Settings, unknown> {
    readonly appearance: AppearanceSettingsView;
    readonly calls: CallsSettingsView;
    readonly chat: ChatSettingsView;
    readonly devices: DevicesSettingsView;
    readonly media: MediaSettingsView;
    readonly privacy: PrivacySettingsView;
    readonly profile: Omit<ProfileSettingsView, 'profilePicture'>;
}
