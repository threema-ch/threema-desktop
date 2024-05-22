import type {ServicesForModel} from '~/common/model/types/common';
import type {GroupCreator} from '~/common/model/types/group';
import type {IdentityString} from '~/common/network/types';

export function getGroupCreator(
    services: Pick<ServicesForModel, 'device'>,
    creatorIdentity: IdentityString,
): GroupCreator {
    return services.device.identity.string === creatorIdentity
        ? {creatorIsUser: true}
        : {creatorIsUser: false, creatorIdentity};
}
