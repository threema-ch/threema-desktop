import {APPEARANCE_SETTINGS_CODEC, type AppearanceSettings} from '~/common/settings/appearance';
import {CALLS_SETTINGS_CODEC, type CallsSettings} from '~/common/settings/calls';
import {CHAT_SETTINGS_CODEC, type ChatSettings} from '~/common/settings/chat';
import {DEVICES_SETTINGS_CODEC, type DeviceSettings} from '~/common/settings/devices';
import {MEDIA_SETTINGS_CODEC, type MediaSettings} from '~/common/settings/media';
import {PRIVACY_SETTINGS_CODEC, type PrivacySettings} from '~/common/settings/privacy';
import {PROFILE_SETTINGS_CODEC, type ProfileSettings} from '~/common/settings/profile';
import type {u53} from '~/common/types';
import type {AssertAssignable} from '~/common/utils/type-assertions';

const SETTINGS_CATEGORIES = [
    'about',
    'appearance',
    'calls',
    'chat',
    'devices',
    'media',
    'privacy',
    'profile',
    'security',
] as const;

/**
 * The default category, shown when opening the settings.
 */
export const DEFAULT_CATEGORY: SettingsCategory = 'profile';

/**
 * Note: Categories that are not keyof Setting only contain local settings, options or information.
 */
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[u53];

/**
 * A subset of {@link Settings}, which includes only the local settings (i.e., the ones not synced
 * across devices).
 */
export interface LocalSettings {
    readonly appearance: AppearanceSettings;
    readonly chat: ChatSettings;
    readonly devices: DeviceSettings;
    readonly media: MediaSettings;
}

/**
 * A subset of {@link Settings}, which includes only the synced settings.
 */
interface SyncedSettings {
    readonly calls: CallsSettings;
    readonly privacy: PrivacySettings;
    readonly profile: ProfileSettings;
}

// Whenever this is extended, the function isSettingCategory needs to be updated as well
export type Settings = LocalSettings & SyncedSettings;

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

export interface SettingsCategoryCodec<TKey extends keyof Settings> {
    readonly encode: (settings: Settings[TKey]) => Uint8Array;
    readonly decode: (encoded: Uint8Array) => Settings[TKey];
}

export type SettingsCategoryCodecs = {
    readonly [TKey in keyof Settings]: SettingsCategoryCodec<TKey>;
};

export const SETTINGS_CODEC: SettingsCategoryCodecs = {
    appearance: APPEARANCE_SETTINGS_CODEC,
    calls: CALLS_SETTINGS_CODEC,
    chat: CHAT_SETTINGS_CODEC,
    devices: DEVICES_SETTINGS_CODEC,
    media: MEDIA_SETTINGS_CODEC,

    profile: PROFILE_SETTINGS_CODEC,
    privacy: PRIVACY_SETTINGS_CODEC,
} as const;
