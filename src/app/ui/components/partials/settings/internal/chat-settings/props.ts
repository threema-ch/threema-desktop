import type {AppServicesForSvelte} from '~/app/types';
import type {ChatSettingsUpdate, ChatSettingsView} from '~/common/model/types/settings';

export interface ChatSettingsProps {
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
    readonly actions: {
        readonly updateSettings: (update: ChatSettingsUpdate) => void;
    };
    readonly settings: ChatSettingsView;
}
