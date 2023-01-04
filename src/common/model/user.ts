import {ReceiverType} from '~/common/enum';
import {
    type ProfilePicture,
    type ProfileSettings,
    type ServicesForModel,
    type User,
} from '~/common/model/';
import {ProfilePictureModelStore} from '~/common/model/profile-picture';
import {ProfileSettingsModelStore} from '~/common/model/settings/profile';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type IdentityString, ensurePublicNickname} from '~/common/network/types';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {idColorIndex, idColorIndexToString} from '~/common/utils/id-color';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';

export class UserModel implements User {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    public readonly identity: IdentityString;
    public readonly displayName: LocalStore<string>;
    public readonly profilePicture: LocalModelStore<ProfilePicture>;

    public readonly profileSettings: LocalModelStore<ProfileSettings>;

    public constructor(services: ServicesForModel) {
        this.identity = services.device.identity.string;
        this.profileSettings = new ProfileSettingsModelStore(services, {
            publicNickname: ensurePublicNickname(this.identity),
        });

        this.displayName = derive(this.profileSettings, (profileSettings) => {
            if (profileSettings.view.publicNickname.trim() === '') {
                return this.identity;
            }
            return profileSettings.view.publicNickname;
        });

        // TODO(WEBMD-624): Get profile picture from DB
        const colorIndex = idColorIndex({type: ReceiverType.CONTACT, identity: this.identity});
        this.profilePicture = new ProfilePictureModelStore(services, {
            color: idColorIndexToString(colorIndex),
        });
    }
}
