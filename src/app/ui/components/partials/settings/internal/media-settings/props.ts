import type {MediaSettingsUpdate, MediaSettingsView} from '~/common/model/types/settings';

/**
 * Props accepted by the `MediaSettings` component.
 */
export interface MediaSettingsProps {
    readonly actions: {
        readonly updateSettings: (update: MediaSettingsUpdate) => void;
    };
    readonly settings: MediaSettingsView;
}
