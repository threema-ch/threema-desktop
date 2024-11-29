import type {ChatSettingsUpdate, ChatSettingsView} from '~/common/model/types/settings';

export interface ChatSettingsProps {
    readonly actions: {
        readonly updateSettings: (update: ChatSettingsUpdate) => void;
    };
    readonly settings: ChatSettingsView;
}
