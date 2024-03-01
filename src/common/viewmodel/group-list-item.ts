import type {DbGroupUid} from '~/common/db';
import type {GroupUserState} from '~/common/enum';
import type {ContactRepository, Group, ProfilePicture} from '~/common/model';
import {getDisplayName, getGroupInitials} from '~/common/model/group';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, type LocalSetStore} from '~/common/utils/store/set-store';
import type {ServicesForViewModel} from '~/common/viewmodel';

export type GroupListItemSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Group>>,
    GroupListItemSetEntry
>;

export interface GroupListItemSetEntry extends PropertiesMarked {
    readonly groupUid: DbGroupUid;
    // TODO(DESK-706): Pass in the GroupController, not the model store
    readonly groupModelStore: LocalModelStore<Group>;
    readonly viewModelStore: GroupListItemViewModelStore;
}

/**
 * Get a set store that contains a {@link GroupListItemViewModel} for every existing group.
 */
export function getGroupListItemSetStore(services: ServicesForViewModel): GroupListItemSetStore {
    const {endpoint, model} = services;
    const groupSetStore = model.groups.getAll();
    return new LocalDerivedSetStore(groupSetStore, (groupStore) =>
        endpoint.exposeProperties({
            groupUid: groupStore.ctx,
            groupModelStore: groupStore,
            viewModelStore: getViewModelStore(services, groupStore),
        }),
    );
}

export type GroupListItemViewModelStore = LocalStore<GroupListItemViewModel>;

/**
 * View model for a row in the group list.
 */
export interface GroupListItemViewModel extends PropertiesMarked {
    readonly uid: DbGroupUid;
    readonly profilePicture: LocalModelStore<ProfilePicture>;
    readonly name: string;
    readonly displayName: string;
    readonly initials: string;
    readonly userState: GroupUserState;
    readonly members: IdentityString[];
    readonly memberNames: string[];
    readonly totalMembersCount: u53;
}

/**
 * Get member names of identity strings
 */
export function getMemberNames(members: IdentityString[], contacts: ContactRepository): string[] {
    const memberNames = [];
    for (const member of members) {
        const contact = contacts.getByIdentity(member);
        if (contact !== undefined) {
            memberNames.push(contact.get().view.displayName);
        }
    }
    return memberNames;
}

/**
 * Get the derived view model store for the specified {@link groupModelStore}.
 */
function getViewModelStore(
    services: ServicesForViewModel,
    groupModelStore: LocalModelStore<Group>,
): GroupListItemViewModelStore {
    const {endpoint, model} = services;

    return derive([groupModelStore], ([{currentValue: groupModel}]) => {
        const memberNames = getMemberNames(groupModel.view.members, model.contacts);

        return endpoint.exposeProperties({
            uid: groupModel.ctx,
            profilePicture: groupModel.controller.profilePicture,
            name: groupModel.view.name,
            displayName: getDisplayName(
                {
                    name: groupModel.view.name,
                    creatorIdentity: groupModel.view.creatorIdentity,
                },
                groupModel.view.members,
                services,
            ),
            initials: getGroupInitials(groupModel.view),
            userState: groupModel.view.userState,
            members: groupModel.view.members,
            memberNames,
            totalMembersCount: groupModel.view.members.length + 1,
        });
    });
}
