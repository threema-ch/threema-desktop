import {ReceiverType} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import {AppearanceSettingsModelStore} from '~/common/model/settings/appearance';
import {CallsSettingsModelStore} from '~/common/model/settings/calls';
import {ChatSettingsModelStore} from '~/common/model/settings/chat';
import {DevicesSettingsModelStore} from '~/common/model/settings/devices';
import {MediaSettingsModelStore} from '~/common/model/settings/media';
import {PrivacySettingsModelStore} from '~/common/model/settings/privacy';
import {ProfileSettingsModelStore} from '~/common/model/settings/profile';
import type {ServicesForModel} from '~/common/model/types/common';
import type {ProfilePictureView} from '~/common/model/types/profile-picture';
import type {
    CallsSettings,
    DevicesSettings,
    MediaSettings,
    PrivacySettings,
    ProfileSettings,
    AppearanceSettings,
    ChatSettings,
} from '~/common/model/types/settings';
import type {User} from '~/common/model/types/user';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {idColorIndex, idColorIndexToString} from '~/common/utils/id-color';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {getGraphemeClusters} from '~/common/utils/string';

/**
 * Determine the initials of the user.
 */
export function getUserInitials(displayName: string): string {
    return getGraphemeClusters(displayName, 2).join('');
}

export class UserModel implements User {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public readonly identity: IdentityString;
    public readonly appearanceSettings: ModelStore<AppearanceSettings>;
    public readonly callsSettings: ModelStore<CallsSettings>;
    public readonly chatSettings: ModelStore<ChatSettings>;
    public readonly devicesSettings: ModelStore<DevicesSettings>;
    public readonly mediaSettings: ModelStore<MediaSettings>;
    public readonly privacySettings: ModelStore<PrivacySettings>;
    public readonly profileSettings: ModelStore<ProfileSettings>;

    public readonly profilePicture: LocalStore<ProfilePictureView>;

    public constructor(services: ServicesForModel) {
        // TODO(DESK-1468): Redundant. Consider removing this.
        this.identity = services.device.identity.string;
        this.appearanceSettings = new AppearanceSettingsModelStore(services);
        this.callsSettings = new CallsSettingsModelStore(services);
        this.chatSettings = new ChatSettingsModelStore(services);
        this.devicesSettings = new DevicesSettingsModelStore(services);
        this.mediaSettings = new MediaSettingsModelStore(services);
        this.privacySettings = new PrivacySettingsModelStore(services);
        this.profileSettings = new ProfileSettingsModelStore(services);

        // Derivations of above stores

        // TODO(DESK-624): Get profile picture from DB
        const colorIndex = idColorIndex({type: ReceiverType.CONTACT, identity: this.identity});
        this.profilePicture = derive(
            [this.profileSettings],
            ([{currentValue: profileSettingsModel}]) => ({
                color: idColorIndexToString(colorIndex),
                picture: profileSettingsModel.view.profilePicture,
            }),
        );
    }
}
