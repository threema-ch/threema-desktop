import type {ProfilePictureView} from '~/common/model/types/profile-picture';
import type {
    AppearanceSettings,
    CallsSettings,
    ChatSettings,
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
    /** UI appearance settings. */
    readonly appearanceSettings: LocalModelStore<AppearanceSettings>;

    /** Applied call settings. */
    readonly callsSettings: LocalModelStore<CallsSettings>;

    /** User chat settings. */
    readonly chatSettings: LocalModelStore<ChatSettings>;

    /** Settings for this specific device of the user. */
    readonly devicesSettings: LocalModelStore<DevicesSettings>;

    /** Settings applied for media. */
    readonly mediaSettings: LocalModelStore<MediaSettings>;

    /** Applied privacy settings. */
    readonly privacySettings: LocalModelStore<PrivacySettings>;

    /** User profile settings. */
    readonly profileSettings: LocalModelStore<ProfileSettings>;

    /** Profile picture color and image (derived from {@link User.profileSettings}). */
    readonly profilePicture: LocalStore<ProfilePictureView>;
} & ProxyMarked;
