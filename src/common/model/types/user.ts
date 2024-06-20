import type {ProfilePictureView} from '~/common/model/types/profile-picture';
import type {
    AppearanceSettings,
    CallsSettings,
    DevicesSettings,
    MediaSettings,
    PrivacySettings,
    ProfileSettings,
} from '~/common/model/types/settings';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';

export type User = {
    /** Permanent Threema ID of the user. */
    readonly identity: IdentityString;

    /** User profile settings. */
    readonly profileSettings: LocalModelStore<ProfileSettings>;

    /** Applied privacy settings. */
    readonly privacySettings: LocalModelStore<PrivacySettings>;

    /** Applied call settings. */
    readonly callsSettings: LocalModelStore<CallsSettings>;

    /** Settings for this specific device of the user. */
    readonly devicesSettings: LocalModelStore<DevicesSettings>;

    /** UI appearance settings. */
    readonly appearanceSettings: LocalModelStore<AppearanceSettings>;

    /** Settings applied for media. */
    readonly mediaSettings: LocalModelStore<MediaSettings>;

    /** Profile picture color and image (derived from {@link User.profileSettings}). */
    readonly profilePicture: LocalStore<ProfilePictureView>;

    /**
     * Display name of the user (i.e. Nickname with fallback to the Threema ID, derived from
     * {@link User.profileSettings} and {@link User.identity}).
     *
     * @deprecated TODO(DESK-1421): Move into viewmodel?
     */
    readonly displayName: LocalStore<string>;
} & ProxyMarked;
