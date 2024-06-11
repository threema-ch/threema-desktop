import type {IdentityString} from '~/common/network/types';

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
