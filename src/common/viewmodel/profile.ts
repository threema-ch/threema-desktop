import type {PublicKey} from '~/common/crypto';
import type {ProfilePictureView} from '~/common/model';
import {getUserInitials} from '~/common/model/user';
import type {IdentityString, Nickname} from '~/common/network/types';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';

export type ProfileViewModelStore = LocalStore<ProfileViewModel>;

export interface ProfileViewModel extends PropertiesMarked {
    readonly profilePicture: ProfilePictureView;
    readonly nickname: Nickname | undefined;
    readonly initials: string;
    readonly identity: IdentityString;
    readonly displayName: string;
    readonly publicKey: PublicKey;
    readonly workUsername: string | undefined;
}

export function getProfileViewModelStore(services: ServicesForViewModel): ProfileViewModelStore {
    const {endpoint, device, model} = services;

    return derive(
        [model.user.profileSettings],
        ([{currentValue: profileSettingsModel}], getAndSubscribe) => {
            const displayName = profileSettingsModel.view.nickname ?? device.identity.string;
            return endpoint.exposeProperties({
                profilePicture: getAndSubscribe(model.user.profilePicture),
                nickname: profileSettingsModel.view.nickname,
                initials: getUserInitials(displayName),
                identity: device.identity.string,
                displayName,
                publicKey: device.csp.ck.public,
                workUsername: device.workData?.workCredentials.username,
            });
        },
    );
}
