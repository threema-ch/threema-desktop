import {CALLS_SETTINGS_CODEC, type CallsSettings} from '~/common/settings/calls';
import {PRIVACY_SETTINGS_CODEC, type PrivacySettings} from '~/common/settings/privacy';
import {PROFILE_SETTINGS_CODEC, type ProfileSettings} from '~/common/settings/profile';

// Whenever this is extended, the function isSettingCategory needs to be updated as well
export interface Settings {
    profile: ProfileSettings;
    privacy: PrivacySettings;
    calls: CallsSettings;
}

/**
 * Categories that are not keyof Setting only contain local settings, options or information
 */
export type SettingsCategory = keyof Settings | 'security' | 'about' | 'appearance';

export type DefaultSetting = 'profile';
/**
 * Checks if a string can be mapped to a setting category
 */
function isSettingsCategory(category: string): category is SettingsCategory {
    switch (category) {
        case 'profile':
        case 'privacy':
        case 'calls':
        case 'security':
        case 'about':
        case 'appearance':
            return true;
        default:
            return false;
    }
}

/**
 * Ensure input is a valid {@link category}
 */
export function ensureSettingsCategory(category: string): SettingsCategory {
    if (!isSettingsCategory(category)) {
        throw new Error(`Not a valid settings category: '${category}'`);
    }
    return category;
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
