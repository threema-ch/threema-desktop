import {ReceiverType} from '~/common/enum';
import {CallsSettingsModelStore} from '~/common/model/settings/calls';
import {PrivacySettingsModelStore} from '~/common/model/settings/privacy';
import {ProfileSettingsModelStore} from '~/common/model/settings/profile';
import {type ServicesForModel} from '~/common/model/types/common';
import {type ProfilePictureView} from '~/common/model/types/profile-picture';
import {
    type CallsSettings,
    type PrivacySettings,
    type ProfileSettings,
} from '~/common/model/types/settings';
import {type User} from '~/common/model/types/user';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {ensureNickname, type IdentityString} from '~/common/network/types';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {idColorIndex, idColorIndexToString} from '~/common/utils/id-color';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';

export class UserModel implements User {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public readonly identity: IdentityString;
    public readonly displayName: LocalStore<string>;
    public readonly profilePicture: LocalStore<ProfilePictureView>;
    public readonly profileSettings: LocalModelStore<ProfileSettings>;
    public readonly privacySettings: LocalModelStore<PrivacySettings>;
    public readonly callsSettings: LocalModelStore<CallsSettings>;

    public constructor(services: ServicesForModel) {
        this.identity = services.device.identity.string;
        this.profileSettings = new ProfileSettingsModelStore(services, {
            nickname: ensureNickname(this.identity),
            profilePictureShareWith: {group: 'everyone'},
        });
        this.privacySettings = new PrivacySettingsModelStore(services, {});
        this.callsSettings = new CallsSettingsModelStore(services, {});

        this.displayName = derive(
            this.profileSettings,
            ({view: {nickname}}) => nickname ?? this.identity,
        );

        // TODO(DESK-624): Get profile picture from DB
        const colorIndex = idColorIndex({type: ReceiverType.CONTACT, identity: this.identity});
        this.profilePicture = derive(this.profileSettings, (profileSettings) => ({
            color: idColorIndexToString(colorIndex),
            picture: profileSettings.view.profilePicture,
        }));
    }
}
