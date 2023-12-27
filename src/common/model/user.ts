import {ReceiverType} from '~/common/enum';
import {AppearanceSettingsModelStore} from '~/common/model/settings/appearance';
import {CallsSettingsModelStore} from '~/common/model/settings/calls';
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
} from '~/common/model/types/settings';
import type {User} from '~/common/model/types/user';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {ensureNickname, type IdentityString} from '~/common/network/types';
import {RESTRICTED_DOWNLOAD_SIZE_IN_MB} from '~/common/settings/media';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
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
    public readonly displayName: LocalStore<string>;
    public readonly profilePicture: LocalStore<ProfilePictureView>;
    public readonly profileSettings: LocalModelStore<ProfileSettings>;
    public readonly privacySettings: LocalModelStore<PrivacySettings>;
    public readonly callsSettings: LocalModelStore<CallsSettings>;
    public readonly devicesSettings: LocalModelStore<DevicesSettings>;
    public readonly appearanceSettings: LocalModelStore<AppearanceSettings>;
    public readonly mediaSettings: LocalModelStore<MediaSettings>;
    public constructor(services: ServicesForModel) {
        this.identity = services.device.identity.string;
        this.profileSettings = new ProfileSettingsModelStore(services, {
            nickname: ensureNickname(this.identity),
            profilePictureShareWith: {group: 'everyone'},
        });
        this.privacySettings = new PrivacySettingsModelStore(services, {});
        this.callsSettings = new CallsSettingsModelStore(services, {});
        this.devicesSettings = new DevicesSettingsModelStore(services);
        this.appearanceSettings = new AppearanceSettingsModelStore(services);
        this.mediaSettings = new MediaSettingsModelStore(services, {
            autoDownload: {on: true, limitInMb: RESTRICTED_DOWNLOAD_SIZE_IN_MB},
        });

        this.displayName = derive(
            this.profileSettings,
            ({view: {nickname}}) => nickname ?? this.identity,
        );

        // TODO(DESK-624): Get profile picture from DB
        const colorIndex = idColorIndex({type: ReceiverType.CONTACT, identity: this.identity});
        this.profilePicture = derive(this.profileSettings, (profileSettings, getAndSubscribe) => ({
            color: idColorIndexToString(colorIndex),
            picture: profileSettings.view.profilePicture,
        }));
    }
}
