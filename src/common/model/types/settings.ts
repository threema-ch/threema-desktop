// Profile Settings

import type {
    O2oCallConnectionPolicy,
    O2oCallPolicy,
    ContactSyncPolicy,
    GlobalPropertyKey,
    InactiveContactsPolicy,
    KeyboardDataCollectionPolicy,
    ReadReceiptPolicy,
    ScreenshotPolicy,
    TimeFormat,
    TypingIndicatorPolicy,
    UnknownContactPolicy,
    GroupCallPolicy,
    ComposeBarEnterMode,
} from '~/common/enum';
import type {AutoDownload} from '~/common/model/settings/media';
import type {ProfilePictureShareWith} from '~/common/model/settings/profile';
import type {LocalModel} from '~/common/model/types/common';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {ModelStore, RemoteModelStore} from '~/common/model/utils/model-store';
import type {DeviceName, IdentityString, Nickname} from '~/common/network/types';
import type {Settings} from '~/common/settings';
import type {ReadonlyUint8Array, StrictExtract} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

// Note: Type must be compatible with common.settings.ProfileSettings
export interface ProfileSettingsView {
    readonly nickname?: Nickname | undefined;
    readonly profilePicture?: ReadonlyUint8Array;
    readonly profilePictureShareWith: ProfilePictureShareWith;
}
export type ProfileSettingsUpdate = Partial<ProfileSettingsView>;
export type ProfileSettingsController = {
    readonly meta: ModelLifetimeGuard<ProfileSettingsView>;
    readonly update: (change: ProfileSettingsUpdate) => Promise<void>;
} & ProxyMarked;
export type ProfileSettings = LocalModel<ProfileSettingsView, ProfileSettingsController>;

// Privacy Settings

// Note: Type must be compatible with common.settings.PrivacySettings
export interface PrivacySettingsView {
    readonly contactSyncPolicy?: ContactSyncPolicy;
    readonly unknownContactPolicy?: UnknownContactPolicy;
    readonly readReceiptPolicy?: ReadReceiptPolicy;
    readonly typingIndicatorPolicy?: TypingIndicatorPolicy;
    readonly screenshotPolicy?: ScreenshotPolicy;
    readonly keyboardDataCollectionPolicy?: KeyboardDataCollectionPolicy;
    readonly blockedIdentities?: {readonly identities: IdentityString[]};
    readonly excludeFromSyncIdentities?: {readonly identities: IdentityString[]};
}
export type PrivacySettingsUpdate = Partial<PrivacySettingsView>;
export type PrivacySettingsController = {
    readonly meta: ModelLifetimeGuard<PrivacySettingsView>;
    readonly update: (change: PrivacySettingsUpdate) => Promise<void>;

    /**
     * Returns whether an identity string is explicitly blocked, i.e. whether it is present in the
     * `blockedIdentities` list in the privacy settings.
     */
    readonly isIdentityExplicitlyBlocked: (identityString: IdentityString) => boolean;

    /**
     * Returns whether a contact is explicitly or implicitly blocked as per the the privacy
     * settings.
     */
    readonly isContactBlocked: (identityString: IdentityString) => boolean;
} & ProxyMarked;
export type PrivacySettings = LocalModel<PrivacySettingsView, PrivacySettingsController>;

// Calls Settings

// Note: Type must be compatible with common.settings.CallsSettings
export interface CallsSettingsView {
    readonly o2oCallPolicy: O2oCallPolicy;
    readonly o2oCallConnectionPolicy: O2oCallConnectionPolicy;
    readonly groupCallPolicy: GroupCallPolicy;
}
export type CallsSettingsUpdate = Partial<CallsSettingsView>;
export type CallsSettingsController = {
    readonly meta: ModelLifetimeGuard<CallsSettingsView>;
    readonly update: (change: CallsSettingsUpdate) => Promise<void>;
} & ProxyMarked;
export type CallsSettings = LocalModel<CallsSettingsView, CallsSettingsController>;

// Chat Settings

// Note: Type must be compatible with common.settings.ChatSettings
export interface ChatSettingsView {
    readonly composeBarEnterMode: ComposeBarEnterMode;

    // Derived properties

    /**
     * Whether submit a message on enter.
     */
    readonly onEnterSubmit: boolean;
}

export type ChatSettingsUpdate = Partial<ChatSettingsViewNonDerivedProperties>;
export type ChatSettingsController = {
    readonly meta: ModelLifetimeGuard<ChatSettingsView>;
    readonly update: (change: ChatSettingsUpdate) => Promise<void>;
} & ProxyMarked;

export type ChatSettings = LocalModel<ChatSettingsView, ChatSettingsController>;

export type ChatSettingsViewDerivedProperties = StrictExtract<
    keyof ChatSettingsView,
    'onEnterSubmit'
>;
export type ChatSettingsViewNonDerivedProperties = Omit<
    ChatSettingsView,
    ChatSettingsViewDerivedProperties
>;

// Devices Settings

// Note: Type must be compatible with common.settings.DevicesSettings
export interface DevicesSettingsView {
    readonly deviceName: DeviceName;
}
export type DevicesSettingsUpdate = Partial<DevicesSettingsView>;
export type DevicesSettingsController = {
    readonly meta: ModelLifetimeGuard<DevicesSettingsView>;
    readonly update: (change: DevicesSettingsUpdate) => Promise<void>;
} & ProxyMarked;
export type DevicesSettings = LocalModel<DevicesSettingsView, DevicesSettingsController>;

// Appearance Settings

// Note: Must be compatible with common.settings.AppearanceSettings
export interface AppearanceSettingsView {
    readonly timeFormat: TimeFormat;
    readonly inactiveContactsPolicy: InactiveContactsPolicy;

    // Derived properties

    /**
     * Whether to show time in 24h format.
     */
    readonly use24hTime: boolean;
}
export type AppearanceSettingsViewDerivedProperties = StrictExtract<
    keyof AppearanceSettingsView,
    'use24hTime'
>;
export type AppearanceSettingsViewNonDerivedProperties = Omit<
    AppearanceSettingsView,
    AppearanceSettingsViewDerivedProperties
>;
export type AppearanceSettingsUpdate = Omit<Partial<AppearanceSettingsView>, 'use24hTime'>;
export type AppearanceSettingsController = {
    readonly meta: ModelLifetimeGuard<AppearanceSettingsView>;
    readonly update: (change: AppearanceSettingsUpdate) => Promise<void>;
} & ProxyMarked;
export type AppearanceSettings = LocalModel<AppearanceSettingsView, AppearanceSettingsController>;

// Media settings
export interface MediaSettingsView {
    readonly autoDownload: AutoDownload;
}
export type MediaSettingsUpdate = Partial<MediaSettingsView>;
export type MediaSettingsController = {
    readonly meta: ModelLifetimeGuard<MediaSettingsView>;
    readonly update: (change: MediaSettingsUpdate) => Promise<void>;
} & ProxyMarked;
export type MediaSettings = LocalModel<MediaSettingsView, MediaSettingsController>;

// Settings service interface, bundling all available settings stores

export interface SettingsService extends Record<keyof Settings, unknown> {
    readonly profile: RemoteModelStore<ProfileSettings>;
    readonly chat: RemoteModelStore<ChatSettings>;
    readonly privacy: RemoteModelStore<PrivacySettings>;
    readonly devices: RemoteModelStore<DevicesSettings>;
    readonly appearance: RemoteModelStore<AppearanceSettings>;
    readonly calls: RemoteModelStore<CallsSettings>;
    readonly media: RemoteModelStore<MediaSettings>;
}

// Global Properties

/**
 * Mapping of GlobalProperty Keys to decoded Value Types.
 */
export interface GlobalPropertyValues extends Record<GlobalPropertyKey, unknown> {
    readonly lastMediatorConnection: {readonly date?: Date | undefined};
    readonly applicationState: {readonly unrecoverableStateDetected?: boolean | undefined};
}

export type IGlobalPropertyRepository = {
    /**
     * Create a system property with a certain value corresponding to the key-value type mapping in
     * {@link GlobalPropertyValues}. Note that the property must not yet exist.
     *
     * @param init The system property data
     * @throws Error if property already exists.
     */
    readonly create: <K extends GlobalPropertyKey>(
        key: K,
        value: GlobalPropertyValues[K],
    ) => ModelStore<IGlobalPropertyModel<K>>;

    /**
     * Create a system property with a certain value corresponding to the key-value type mapping in
     * {@link GlobalPropertyValues}. Note that the property may already exist and will be
     * overwritten.
     *
     * @param init The system property data
     */
    readonly createOrUpdate: <K extends GlobalPropertyKey>(
        key: K,
        value: GlobalPropertyValues[K],
    ) => ModelStore<IGlobalPropertyModel<K>>;

    /**
     * Get a system property, if it exists.
     *
     * @param init The system property data
     */
    readonly get: <K extends GlobalPropertyKey>(
        key: K,
    ) => ModelStore<IGlobalPropertyModel<K>> | undefined;

    /**
     * Get a system property or create one with the default value if it does not yet exist.
     *
     * @param init The system property data
     */
    readonly getOrCreate: <K extends GlobalPropertyKey>(
        key: K,
        defaultValue: GlobalPropertyValues[K],
    ) => ModelStore<IGlobalPropertyModel<K>>;
} & ProxyMarked;
export interface GlobalPropertyView<K extends GlobalPropertyKey> {
    readonly key: K;
    readonly value: GlobalPropertyValues[K];
}
export type GlobalPropertyInit<K extends GlobalPropertyKey> = GlobalPropertyView<K>;
export type GlobalPropertyUpdate<K extends GlobalPropertyKey> = Omit<GlobalPropertyView<K>, 'key'>;
export type IGlobalPropertyController<K extends GlobalPropertyKey> = {
    readonly meta: ModelLifetimeGuard<GlobalPropertyView<K>>;
    readonly update: (change: GlobalPropertyUpdate<K>) => void;
} & ProxyMarked;
export type IGlobalPropertyModel<K extends GlobalPropertyKey> = LocalModel<
    GlobalPropertyView<K>,
    IGlobalPropertyController<K>,
    K
>;
