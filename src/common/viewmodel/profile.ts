import {type PublicKey} from '~/common/crypto';
import {type AvatarView} from '~/common/model';
import {type IdentityString, type PublicNickname} from '~/common/network/types';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {getGraphemeClusters} from '~/common/utils/string';
import {type ServicesForViewModel} from '~/common/viewmodel';

export type ProfileViewModelStore = LocalStore<ProfileViewModel>;

function getMyDisplayName(publicNickname: PublicNickname, identity: IdentityString): string {
    if (publicNickname !== '') {
        return publicNickname;
    }
    return identity;
}

export interface ProfileViewModel extends PropertiesMarked {
    readonly avatar: AvatarView;
    readonly nickname: PublicNickname;
    readonly initials: string;
    readonly identity: IdentityString;
    readonly displayName: string;
    readonly publicKey: PublicKey;
}

export function getProfileViewModelStore(services: ServicesForViewModel): ProfileViewModelStore {
    const {endpoint, device, model} = services;

    return derive(model.user.profileSettings, (profileSettings, getAndSubscribe) => {
        const displayName = getMyDisplayName(
            profileSettings.view.publicNickname,
            device.identity.string,
        );
        const initials = getGraphemeClusters(displayName, 2).join('');
        return endpoint.exposeProperties({
            avatar: getAndSubscribe(model.user.avatar).view,
            nickname: profileSettings.view.publicNickname,
            initials,
            identity: device.identity.string,
            displayName,
            publicKey: device.csp.ck.public,
        });
    });
}
