import {CALLS_SETTINGS_CODEC, type CallsSettings} from '~/common/settings/calls';
import {PRIVACY_SETTINGS_CODEC, type PrivacySettings} from '~/common/settings/privacy';
import {PROFILE_SETTINGS_CODEC, type ProfileSettings} from '~/common/settings/profile';
import type {u53} from '~/common/types';
import type {AssertAssignable} from '~/common/utils/type-assertions';

const SETTINGS_CATEGORIES = [
    'profile',
    'privacy',
    'calls',
    'security',
    'about',
    'appearance',
] as const;

/**
 * The default category, shown when opening the settings.
 */
export const DEFAULT_CATEGORY: SettingsCategory = 'profile';

/**
 * Note: Categories that are not keyof Setting only contain local settings, options or information.
 */
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[u53];

// Whenever this is extended, the function isSettingCategory needs to be updated as well
export interface Settings {
    readonly profile: ProfileSettings;
    readonly privacy: PrivacySettings;
    readonly calls: CallsSettings;
}

// Ensure that every key in `Settings` is a valid `SettingsCategory`
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
type SettingsAssertions = AssertAssignable<Record<SettingsCategory, any>, Settings>;

/**
 * Checks if a string can be mapped to a setting category
 */
function isSettingsCategory(category: string): category is SettingsCategory {
    return (SETTINGS_CATEGORIES as readonly string[]).includes(category);
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

export type DefaultSetting = 'profile';

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
