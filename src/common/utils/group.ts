import type {ServicesForModel} from '~/common/model/types/common';
import type {GroupCreator} from '~/common/model/types/group';
import type {IdentityString} from '~/common/network/types';

export function getGroupCreator(
    services: Pick<ServicesForModel, 'device'>,
    creatorIdentity: IdentityString,
): GroupCreator {
    return services.device.identity.string === creatorIdentity
        ? {isUser: true}
        : {isUser: false, creatorIdentity};
}

/**
 * Returns whether the group creator is a Gateway ID.
 */
export function isGroupManagedByGateway(groupCreatorIdentity: IdentityString): boolean {
    return groupCreatorIdentity.startsWith('*');
}

/**
 * Returns whether the group creator is a Gateway ID and is monitoring the conversation.
 */
export function isGroupManagedAndMonitoredByGateway(
    groupName: string,
    groupCreatorIdentity: IdentityString,
): boolean {
    return isGroupManagedByGateway(groupCreatorIdentity) && groupName.startsWith('☁');
}
