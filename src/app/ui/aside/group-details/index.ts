import {
    type ReceiverNotificationPolicy,
    transformNotificationPolicyFromGroup,
} from '~/app/ui/generic/receiver';
import {type DbReceiverLookup} from '~/common/db';
import {GroupUserState, ReceiverType} from '~/common/enum';
import {type Contact, type Group, type ProfilePicture, type RemoteModelFor} from '~/common/model';
import {type RemoteModelStore} from '~/common/model/utils/model-store';
import {type IdentityString} from '~/common/network/types';
import {assertUnreachable} from '~/common/utils/assert';
import {type Remote} from '~/common/utils/endpoint';
import {type IQueryableStore, DeprecatedDerivedStore} from '~/common/utils/store';
import {type RemoteSetStore} from '~/common/utils/store/set-store';
import {type GroupListItemViewModel} from '~/common/viewmodel/group-list-item';
import {type GroupData, type GroupUserState as GroupUserState3SC} from '~/common/viewmodel/types';

/**
 * Sort group members by display name. Creator will always be shown as first member.
 */
export function sortGroupMembers(
    members: ReadonlySet<RemoteModelStore<Contact>>,
    creatorIdentity: IdentityString,
): readonly RemoteModelStore<Contact>[] {
    return (
        [...members]
            // Sort by display name
            .sort((storeA, storeB) => {
                const nameA = storeA.get().view.displayName;
                const nameB = storeB.get().view.displayName;
                if (nameA < nameB) {
                    return -1;
                } else if (nameA > nameB) {
                    return 1;
                } else {
                    return 0;
                }
            })
            // Sort by creator (creator should be always first member)
            .sort((storeA, storeB) => {
                if (storeA.get().view.identity === creatorIdentity) {
                    return -1;
                }
                if (storeB.get().view.identity === creatorIdentity) {
                    return 1;
                }
                return 0;
            })
    );
}

/**
 * Transformed data necessary to display a contact in several places in the UI.
 */
export type TransformedGroup = GroupData & {
    readonly lookup: DbReceiverLookup;
    readonly creator: string;
    readonly name: string;
    readonly displayName: string;
    readonly isInactive: boolean;
    readonly notifications: ReceiverNotificationPolicy;
};

/**
 * Stores necessary to display a conversation preview.
 */
export interface GroupPreviewStores {
    /**
     * Profile picture of the group
     */
    readonly profilePicture: RemoteModelStore<ProfilePicture>;

    /**
     * Members of the group
     */
    readonly members: IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>>;
}

/**
 * Filter groups by user input string and sort result by group.displayName
 */
export function filterGroups(
    set: ReadonlySet<RemoteModelStore<Group>>,
    filter: string,
): IQueryableStore<readonly RemoteModelStore<Group>[]> {
    return new DeprecatedDerivedStore([...set.values()], (item) =>
        [...item]
            .filter((itemFilter) =>
                [itemFilter[1].view.name, itemFilter[1].view.creatorIdentity]
                    .join(' ')
                    .toLowerCase()
                    .includes(filter.trim().toLowerCase()),
            )
            .sort(([, {view: a}], [, {view: b}]) => {
                const nameA = a.displayName;
                const nameB = b.displayName;
                if (nameA < nameB) {
                    return -1;
                } else if (nameA > nameB) {
                    return 1;
                } else {
                    return 0;
                }
            })
            .map(([store]) => store),
    );
}

// TODO(WEBMD-577): This will be superseded by a new store with this ticket.
function getMembersForGroup(
    group: RemoteModelStore<Group>,
    contacts: RemoteSetStore<RemoteModelStore<Contact>>,
): IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>> {
    return new DeprecatedDerivedStore(
        [group, contacts] as const,
        ([[, groupModel], [, contactsSet]]) => {
            const memberIdentities = groupModel.view.members;
            const memberEntries = [...contactsSet.values()].filter((remoteContactModelStore) =>
                memberIdentities.includes(remoteContactModelStore.get().view.identity),
            );
            return new Set(memberEntries);
        },
    );
}

export async function getProfilePictureAndMemberStores(
    group: RemoteModelStore<Group>,
    contacts: RemoteSetStore<RemoteModelStore<Contact>>,
): Promise<GroupPreviewStores> {
    return {
        profilePicture: await group.get().controller.profilePicture(),
        members: getMembersForGroup(group, contacts),
    };
}

export function transformGroupUserState(userState: GroupUserState): GroupUserState3SC {
    switch (userState) {
        case GroupUserState.MEMBER:
            return 'member';
        case GroupUserState.KICKED:
            return 'kicked';
        case GroupUserState.LEFT:
            return 'left';
        default:
            return assertUnreachable(userState);
    }
}

export function isUserStateOfInactiveGroup(userState: GroupUserState3SC): boolean {
    return userState !== 'member';
}

/**
 * Return whether the {@link GroupView} matches the {@link filter}.
 */
export function matchesGroupSearchFilter(
    filter: string,
    group: Pick<Remote<GroupListItemViewModel>, 'name' | 'members' | 'memberNames'>,
): boolean {
    const trimmedFilter = filter.trim();
    if (trimmedFilter === '') {
        return true;
    }

    return [group.name, group.members.join(''), group.memberNames.join('')]
        .join(' ')
        .toLowerCase()
        .includes(trimmedFilter.toLowerCase());
}

export function transformGroup(group: RemoteModelFor<Group>): TransformedGroup {
    const userState = transformGroupUserState(group.view.userState);

    return {
        lookup: {
            type: ReceiverType.GROUP,
            uid: group.ctx,
        },
        creator: group.view.creatorIdentity,
        name: group.view.name,
        displayName: group.view.displayName,
        userState,
        isInactive: isUserStateOfInactiveGroup(userState),
        notifications: transformNotificationPolicyFromGroup(group.view),
        members: [],
        memberNames: [],
    };
}
