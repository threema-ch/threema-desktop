import {
    type ReceiverNotificationPolicy,
    transformNotificationPolicyFromGroup,
} from '~/app/ui/generic/receiver';
import type {DbGroupReceiverLookup} from '~/common/db';
import {GroupUserState, ReceiverType} from '~/common/enum';
import type {Contact, Group, ProfilePicture, RemoteModelFor} from '~/common/model';
import type {RemoteModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {RemoteSetStore} from '~/common/utils/store/set-store';
import type {GroupListItemViewModel} from '~/common/viewmodel/group-list-item';
import type {GroupData} from '~/common/viewmodel/types';

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
                return nameA.localeCompare(nameB);
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
    readonly lookup: DbGroupReceiverLookup;
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

// TODO(DESK-577): This will be superseded by a new store with this ticket.
function getMembersForGroup(
    group: RemoteModelStore<Group>,
    contacts: RemoteSetStore<RemoteModelStore<Contact>>,
): IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>> {
    return derive([group, contacts], ([groupModel, contactsSet]) => {
        const memberIdentities = groupModel.currentValue.view.members;
        const memberEntries = [...contactsSet.currentValue.values()].filter(
            (remoteContactModelStore) =>
                memberIdentities.includes(remoteContactModelStore.get().view.identity),
        );
        return new Set(memberEntries);
    });
}

export async function getProfilePictureAndMemberStores(
    group: RemoteModelStore<Group>,
    contacts: RemoteSetStore<RemoteModelStore<Contact>>,
): Promise<GroupPreviewStores> {
    return {
        profilePicture: await group.get().controller.profilePicture,
        members: getMembersForGroup(group, contacts),
    };
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
    return {
        lookup: {
            type: ReceiverType.GROUP,
            uid: group.ctx,
        },
        creator: group.view.creatorIdentity,
        name: group.view.name,
        displayName: group.view.displayName,
        isInactive: group.view.userState !== GroupUserState.MEMBER,
        notifications: transformNotificationPolicyFromGroup(group.view),
        members: [],
        memberNames: [],
    };
}
