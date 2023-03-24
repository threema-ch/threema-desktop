import {CALLS_SETTINGS_CODEC, type CallsSettings} from '~/common/settings/calls';
import {PRIVACY_SETTINGS_CODEC, type PrivacySettings} from '~/common/settings/privacy';
import {PROFILE_SETTINGS_CODEC, type ProfileSettings} from '~/common/settings/profile';

export interface Settings {
    profile: ProfileSettings;
    privacy: PrivacySettings;
    calls: CallsSettings;
}

export interface SettingsCategoryCodec<TKey extends keyof Settings> {
    readonly encode: (settings: Settings[TKey]) => Uint8Array;
    readonly decode: (encoded: Uint8Array) => Settings[TKey];
}

export type SettingsCategoryCodecs = {
    readonly [TKey in keyof Settings]: SettingsCategoryCodec<TKey>;
};

export const SETTINGS_CODEC: SettingsCategoryCodecs = {
    profile: PROFILE_SETTINGS_CODEC,
    privacy: PRIVACY_SETTINGS_CODEC,
    calls: CALLS_SETTINGS_CODEC,
} as const;
