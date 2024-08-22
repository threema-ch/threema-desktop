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
import type {ModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';

export type User = {
    /** Permanent Threema ID of the user. */
    readonly identity: IdentityString;
    /** UI appearance settings. */
    readonly appearanceSettings: ModelStore<AppearanceSettings>;

    /** Applied call settings. */
    readonly callsSettings: ModelStore<CallsSettings>;

    /** User chat settings. */
    readonly chatSettings: ModelStore<ChatSettings>;

    /** Settings for this specific device of the user. */
    readonly devicesSettings: ModelStore<DevicesSettings>;

    /** Settings applied for media. */
    readonly mediaSettings: ModelStore<MediaSettings>;

    /** Applied privacy settings. */
    readonly privacySettings: ModelStore<PrivacySettings>;

    /** User profile settings. */
    readonly profileSettings: ModelStore<ProfileSettings>;

    /** Profile picture color and image (derived from {@link User.profileSettings}). */
    readonly profilePicture: LocalStore<ProfilePictureView>;
} & ProxyMarked;
