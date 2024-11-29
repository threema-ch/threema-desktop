import type {AppServicesForSvelte} from '~/app/types';
import type {AppearanceSettingsUpdate, AppearanceSettingsView} from '~/common/model/types/settings';

/**
 * Props accepted by the `AppearanceSettings` component.
 */
export interface AppearanceSettingsProps {
    readonly services: AppServicesForSvelte;
    readonly actions: {
        readonly updateSettings: (update: AppearanceSettingsUpdate) => void;
    };
    readonly settings: AppearanceSettingsView;
}
