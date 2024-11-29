import type {AppServicesForSvelte} from '~/app/types';
import type {DevicesSettingsUpdate, DevicesSettingsView} from '~/common/model/types/settings';

export interface DevicesSettingsProps {
    readonly services: AppServicesForSvelte;
    readonly actions: {
        readonly updateSettings: (update: DevicesSettingsUpdate) => void;
    };
    readonly settings: DevicesSettingsView;
}
