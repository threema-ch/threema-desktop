// Profile Settings

import {
    type CallConnectionPolicy,
    type CallPolicy,
    type ContactSyncPolicy,
    type GlobalPropertyKey,
    type KeyboardDataCollectionPolicy,
    type ReadReceiptPolicy,
    type ScreenshotPolicy,
    type TypingIndicatorPolicy,
    type UnknownContactPolicy,
} from '~/common/enum';
import {type ProfilePictureShareWith} from '~/common/model/settings/profile';
import {type LocalModel} from '~/common/model/types/common';
import {type ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type IdentityString, type Nickname} from '~/common/network/types';
import {type ReadonlyUint8Array} from '~/common/types';
import {type ProxyMarked} from '~/common/utils/endpoint';

// Note: Type must be compatible with common.settings.ProfileSettings
export interface ProfileSettingsView {
    readonly nickname?: Nickname | undefined;
    readonly profilePicture?: ReadonlyUint8Array;
    readonly profilePictureShareWith: ProfilePictureShareWith;
}
export type ProfileSettingsUpdate = Partial<ProfileSettingsView>;
export type ProfileSettingsController = {
    readonly meta: ModelLifetimeGuard<ProfileSettingsView>;
    readonly update: (change: ProfileSettingsUpdate) => void;
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
    readonly update: (change: PrivacySettingsUpdate) => void;

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
    readonly callPolicy?: CallPolicy;
    readonly callConnectionPolicy?: CallConnectionPolicy;
}
export type CallsSettingsUpdate = Partial<CallsSettingsView>;
export type CallsSettingsController = {
    readonly meta: ModelLifetimeGuard<CallsSettingsView>;
    readonly update: (change: CallsSettingsUpdate) => void;
} & ProxyMarked;
export type CallsSettings = LocalModel<CallsSettingsView, CallsSettingsController>;

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
    ) => LocalModelStore<IGlobalPropertyModel<K>>;

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
    ) => LocalModelStore<IGlobalPropertyModel<K>>;

    /**
     * Get a system property, if it exists.
     *
     * @param init The system property data
     */
    readonly get: <K extends GlobalPropertyKey>(
        key: K,
    ) => LocalModelStore<IGlobalPropertyModel<K>> | undefined;

    /**
     * Get a system property or create one with the default value if it does not yet exist.
     *
     * @param init The system property data
     */
    readonly getOrCreate: <K extends GlobalPropertyKey>(
        key: K,
        defaultValue: GlobalPropertyValues[K],
    ) => LocalModelStore<IGlobalPropertyModel<K>>;
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
