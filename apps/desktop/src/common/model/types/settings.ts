import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';

import type {
    O2oCallConnectionPolicy,
    O2oCallPolicy,
    CallStatisticsPolicy,
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
    AnimatedImageMode,
} from '~/common/enum';
import type * as protobuf from '~/common/internal-protobuf/settings';
import type {MdmAcceptedParamters} from '~/common/mdm';
import type {AutoDownload} from '~/common/model/settings/media';
import type {ProfilePictureShareWith} from '~/common/model/settings/profile';
import type {ControllerUpdate, ControllerUpdateFromLocal, Model} from '~/common/model/types/common';
import type {WorkAvailabilityStatus} from '~/common/model/types/work-availability-status';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {BlobId} from '~/common/network/protocol/blob';
import type {DeviceName, IdentityString, Nickname} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {StrictExtract} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';

// Profile Settings

// Note: Type must be compatible with common.settings.ProfileSettings
export interface ProfileSettingsView {
    readonly nickname?: Nickname | undefined;
    readonly profilePicture?: {
        readonly blob: ReadonlyUint8Array;
        // TODO(DESK-1612) Make these fields mandatory.
        readonly blobId?: BlobId;
        readonly lastUploadedAt?: Date;
        readonly key?: RawBlobKey;
    };
    readonly profilePictureShareWith: ProfilePictureShareWith;
    readonly workAvailabilityStatus: WorkAvailabilityStatus;
}
export type ProfileSettingsUpdate = Partial<ProfileSettingsView>;
export type ProfileSettingsController = {
    readonly lifetimeGuard: ModelLifetimeGuard<ProfileSettingsView>;
    readonly update: Omit<
        ControllerUpdate<[change: ProfileSettingsUpdate]>,
        'fromRemote' | 'fromLocal'
    >;

    readonly setProfilePicture: ControllerUpdateFromLocal<[profilePicture: ReadonlyUint8Array]>;
    readonly removeProfilePicture: ControllerUpdateFromLocal;

    readonly setWorkAvailabilityStatus: ControllerUpdateFromLocal<
        [workAvailabilityStatus: WorkAvailabilityStatus]
    >;
} & ProxyMarked;
export type ProfileSettings = Model<ProfileSettingsView, ProfileSettingsController>;

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
    readonly lifetimeGuard: ModelLifetimeGuard<PrivacySettingsView>;
    readonly update: (change: PrivacySettingsUpdate) => void;

    /**
     * Returns whether an identity string is explicitly blocked, i.e. whether it is present in the
     * `blockedIdentities` list in the privacy settings.
     */
    readonly isIdentityExplicitlyBlocked: (identityString: IdentityString) => boolean;

    /**
     * Returns whether a contact is explicitly or implicitly blocked as per the the privacy
     * settings.
     *
     * This function implements the `Identity Blocked Steps`.
     */
    readonly isContactBlocked: (identityString: IdentityString) => boolean;
} & ProxyMarked;
export type PrivacySettings = Model<PrivacySettingsView, PrivacySettingsController>;

// Calls Settings

// Note: Type must be compatible with common.settings.CallsSettings
export interface CallsSettingsView {
    readonly groupCallPolicy: GroupCallPolicy;
    readonly lastSelectedCamera?: string;
    readonly lastSelectedMicrophone?: string;
    readonly lastSelectedSpeakers?: string;
    readonly o2oCallConnectionPolicy: O2oCallConnectionPolicy;
    readonly o2oCallPolicy: O2oCallPolicy;
}
export type CallsSettingsUpdate = Partial<CallsSettingsView>;
export type CallsSettingsController = {
    readonly lifetimeGuard: ModelLifetimeGuard<CallsSettingsView>;
    readonly update: (change: CallsSettingsUpdate) => void;
} & ProxyMarked;
export type CallsSettings = Model<CallsSettingsView, CallsSettingsController>;

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
    readonly lifetimeGuard: ModelLifetimeGuard<ChatSettingsView>;
    readonly update: (change: ChatSettingsUpdate) => void;
} & ProxyMarked;

export type ChatSettings = Model<ChatSettingsView, ChatSettingsController>;

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
    readonly lifetimeGuard: ModelLifetimeGuard<DevicesSettingsView>;
    readonly update: (change: DevicesSettingsUpdate) => void;
} & ProxyMarked;
export type DevicesSettings = Model<DevicesSettingsView, DevicesSettingsController>;

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
    readonly lifetimeGuard: ModelLifetimeGuard<AppearanceSettingsView>;
    readonly update: (change: AppearanceSettingsUpdate) => void;
} & ProxyMarked;
export type AppearanceSettings = Model<AppearanceSettingsView, AppearanceSettingsController>;

// Media Settings

// Note: Must be compatible with common.settings.MediaSettings
export interface MediaSettingsView {
    readonly autoDownload: AutoDownload;
    readonly animatedImageMode: AnimatedImageMode;
    readonly videoQuality: Exclude<
        protobuf.MediaSettings_VideoQuality,
        protobuf.MediaSettings_VideoQuality.UNRECOGNIZED
    >;
}
export type MediaSettingsUpdate = Partial<MediaSettingsView>;
export type MediaSettingsController = {
    readonly lifetimeGuard: ModelLifetimeGuard<MediaSettingsView>;
    readonly update: (change: MediaSettingsUpdate) => void;
} & ProxyMarked;
export type MediaSettings = Model<MediaSettingsView, MediaSettingsController>;

// Troubleshooting Settings

// Note: Must be compatible with common.settings.TroubleshootingSettings
export interface TroubleshootingSettingsView {
    /** Policy for recording of WebRTC call statistics (rtcstats) on this device. */
    readonly callStatisticsPolicy: CallStatisticsPolicy;
}
export type TroubleshootingSettingsUpdate = Partial<TroubleshootingSettingsView>;
export type TroubleshootingSettingsController = {
    readonly lifetimeGuard: ModelLifetimeGuard<TroubleshootingSettingsView>;
    readonly update: (change: TroubleshootingSettingsUpdate) => void;
} & ProxyMarked;
export type TroubleshootingSettings = Model<
    TroubleshootingSettingsView,
    TroubleshootingSettingsController
>;

// Work Settings

export interface WorkSettingsView {
    readonly logo: {
        readonly light?: {
            readonly url: string;
            readonly blob: Uint8Array;
        };
        readonly dark?: {
            readonly url: string;
            readonly blob: Uint8Array;
        };
    };
    readonly orgName?: string;
    readonly support?: string;
    readonly threemaMdmParameters: ReadonlyMap<string, MdmAcceptedParamters>;
}
export type WorkSettingsUpdate = Partial<WorkSettingsView>;
export type WorkSettingsController = {
    readonly currentRemoteSecretMdmParameter: IQueryableStore<boolean | undefined>;
    readonly lifetimeGuard: ModelLifetimeGuard<WorkSettingsView>;
    readonly update: (change: WorkSettingsUpdate) => void;
} & ProxyMarked;
export type WorkSettings = Model<WorkSettingsView, WorkSettingsController>;

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
    readonly lifetimeGuard: ModelLifetimeGuard<GlobalPropertyView<K>>;
    readonly update: (change: GlobalPropertyUpdate<K>) => void;
} & ProxyMarked;
export type IGlobalPropertyModel<K extends GlobalPropertyKey> = Model<
    GlobalPropertyView<K>,
    IGlobalPropertyController<K>,
    K
>;
