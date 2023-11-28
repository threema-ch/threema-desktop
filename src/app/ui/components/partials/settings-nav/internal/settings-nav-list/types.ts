import type {SettingsCategory} from '~/common/settings';

export interface SettingsInformation {
    readonly title: string;
    readonly icon: string;
    readonly subText: string;
}

export type SettingsInformationMap = {
    readonly [TKey in SettingsCategory]: SettingsInformation;
};
