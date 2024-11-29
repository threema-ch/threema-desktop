import type {AppServicesForSvelte} from '~/app/types';
import type {ProfileSettingsUpdate, ProfileSettingsView} from '~/common/model/types/settings';

/**
 * Props accepted by the `ProfileSettings` component.
 */
export interface ProfileSettingsProps {
    readonly services: AppServicesForSvelte;
    readonly actions: {
        readonly updateSettings: (update: ProfileSettingsUpdate) => void;
    };
    readonly settings: ProfileSettingsView;
}
