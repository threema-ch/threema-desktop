import {type PublicKey} from '~/common/crypto';
import {type ProfilePictureView} from '~/common/model';
import {type IdentityString, type Nickname} from '~/common/network/types';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {getGraphemeClusters} from '~/common/utils/string';
import {type ServicesForViewModel} from '~/common/viewmodel';

export type ProfileViewModelStore = LocalStore<ProfileViewModel>;

export interface ProfileViewModel extends PropertiesMarked {
    readonly profilePicture: ProfilePictureView;
    readonly nickname: Nickname | undefined;
    readonly initials: string;
    readonly identity: IdentityString;
    readonly displayName: string;
    readonly publicKey: PublicKey;
}

export function getProfileViewModelStore(services: ServicesForViewModel): ProfileViewModelStore {
    const {endpoint, device, model} = services;

    return derive(model.user.profileSettings, ({view: {nickname}}, getAndSubscribe) => {
        const displayName = nickname ?? device.identity.string;
        return endpoint.exposeProperties({
            profilePicture: getAndSubscribe(model.user.profilePicture),
            nickname,
            initials: getGraphemeClusters(displayName, 2).join(''),
            identity: device.identity.string,
            displayName,
            publicKey: device.csp.ck.public,
        });
    });
}
