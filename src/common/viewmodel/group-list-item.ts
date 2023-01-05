import {type DbGroupUid} from '~/common/db';
import {type GroupUserState} from '~/common/enum';
import {type Avatar, type ContactRepository, type Group} from '~/common/model';
import {getDisplayName} from '~/common/model/group';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type IdentityString} from '~/common/network/types';
import {type u53} from '~/common/types';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {type LocalSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import {getGraphemeClusters} from '~/common/utils/string';
import {type ServicesForViewModel} from '~/common/viewmodel';

export type GroupListItemSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Group>>,
    GroupListItemSetEntry
>;

export interface GroupListItemSetEntry extends PropertiesMarked {
    readonly groupUid: DbGroupUid;
    // TODO(WEBMD-706): Pass in the GroupController, not the model store
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
    readonly avatar: LocalModelStore<Avatar>;
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
 * Get the derived view model store for the specified {@link groupStore}.
 */
function getViewModelStore(
    services: ServicesForViewModel,
    groupStore: LocalModelStore<Group>,
): GroupListItemViewModelStore {
    const {endpoint, model} = services;

    return derive(groupStore, (group) => {
        const memberNames = getMemberNames(group.view.members, model.contacts);

        return endpoint.exposeProperties({
            uid: group.ctx,
            avatar: group.controller.avatar(),
            name: group.view.name,
            displayName: getDisplayName(
                {
                    name: group.view.name,
                    creatorIdentity: group.view.creatorIdentity,
                },
                group.view.members,
                services,
            ),
            initials: getGraphemeClusters(group.view.name, 2).join(''),
            userState: group.view.userState,
            members: group.view.members,
            memberNames,
            totalMembersCount: group.view.members.length + 1,
        } as const);
    });
}
