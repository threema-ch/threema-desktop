import type {AppServices} from '~/app/types';
import type {SettingsInformation} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/types';
import type {SettingsCategory} from '~/common/settings';

export interface SettingsNavElementProps {
    readonly services: AppServices;
    readonly category: SettingsCategory;
    readonly settingsInformation: SettingsInformation;
}
