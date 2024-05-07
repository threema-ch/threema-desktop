import type {DbContactUid, DbGroup, DbGroupUid, UidOf} from '~/common/db';
import type {
    GroupNotificationTriggerPolicy,
    GroupUserState,
    NotificationSoundPolicy,
    ReceiverType,
} from '~/common/enum';
import type {
    ControllerUpdateFromLocal,
    ControllerUpdateFromSource,
    ControllerUpdateFromSync,
    LocalModel,
} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationInitMixin} from '~/common/model/types/conversation';
import type {ReceiverController} from '~/common/model/types/receiver';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {GroupId, IdentityString} from '~/common/network/types';
import type {u8, u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {IdColor} from '~/common/utils/id-color';
import type {SequenceNumberU53} from '~/common/utils/sequence-number';
import type {LocalSetStore} from '~/common/utils/store/set-store';

export interface GroupView {
    readonly groupId: GroupId;
    readonly creator: LocalModelStore<Contact> | 'me';
    readonly createdAt: Date;
    readonly name: string;
    readonly displayName: string;
    readonly colorIndex: u8;
    readonly color: IdColor;
    readonly userState: GroupUserState;
    readonly notificationTriggerPolicyOverride?: {
        readonly policy: GroupNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    readonly notificationSoundPolicyOverride?: NotificationSoundPolicy;

    /**
     * The member set contains all members of the group that are not the creator. The creator must
     * never be in the member set!
     *
     * The sole exception is the `User` who is never found in the member list. Its state
     * within the group is entirely managed by `userState`.
     */
    readonly members: Set<LocalModelStore<Contact>>;
}

/**
 * A group creator can either be the user or any other contact. If it is not the user, the identity
 * is needed to fetch the corresponding contact.
 */
export type GroupCreator =
    | {creatorIsUser: false; creatorIdentity: IdentityString}
    | {creatorIsUser: true};

export type GroupInit = Omit<GroupView, 'displayName' | 'members' | 'color'> &
    ConversationInitMixin;
export type GroupUpdate = Partial<
    Omit<
        GroupView,
        'groupId' | 'creator' | 'createdAt' | 'displayName' | 'colorIndex' | 'color' | 'members'
    >
>;
export type GroupUpdateFromLocal = Pick<
    GroupUpdate,
    'notificationTriggerPolicyOverride' | 'notificationSoundPolicyOverride'
>;
/**
 * Group update that may be processed from/to the other devices to/from the local device via group sync.
 */
export type GroupUpdateFromToSync = Pick<
    GroupUpdate,
    'notificationTriggerPolicyOverride' | 'notificationSoundPolicyOverride'
>;

export type GroupController = ReceiverController & {
    readonly uid: UidOf<DbGroup>;

    readonly meta: ModelLifetimeGuard<GroupView>;

    /**
     * Manage group members.
     */
    readonly members: GroupMemberController;

    /**
     * Update group properties that only come from a sync or only trigger a sync.
     */
    readonly update: ControllerUpdateFromSync<[update: GroupUpdateFromToSync]> &
        ControllerUpdateFromLocal<[update: GroupUpdateFromLocal]>;

    /**
     * Update update a group's name.
     */
    readonly name: ControllerUpdateFromSource<[name: string]>;

    /**
     * Remove the group and the corresponding conversation, and deactivate the controller. In case
     * the remove is called locally, sync the update to other devices.
     *
     * fromLocal returns a promise that will be resolved if the group was successfully removed by
     * this or another device. It will be rejected with an error if removing failed.
     */
    readonly remove: Omit<ControllerUpdateFromSource, 'fromRemote'>;

    /**
     * Mark group membership as {@link GroupUserState.KICKED}. This means that we were removed from
     * the group by the creator.
     */
    readonly kick: Omit<ControllerUpdateFromSource, 'fromLocal'>;

    /**
     * Mark group membership as {@link GroupUserState.LEFT}. This means that we left the group.
     */
    readonly leave: Omit<ControllerUpdateFromSource, 'fromRemote'>;

    /**
     * Dissolve a group that we created.
     */
    readonly dissolve: Omit<ControllerUpdateFromSource, 'fromLocal' | 'fromRemote'>;

    /**
     * Return the identity string of the creator.
     */
    readonly getCreatorIdentity: () => IdentityString;
} & ProxyMarked;
export interface GroupControllerHandle {
    /**
     * UID of the group.
     */
    readonly uid: UidOf<DbGroup>;

    /**
     * Debug string of the group.
     */
    readonly debugString: string;

    /**
     * Group version counter that should be incremented for every group update.
     */
    readonly version: SequenceNumberU53<u53>;
}

export type Group = LocalModel<GroupView, GroupController, UidOf<DbGroup>, ReceiverType.GROUP>;

export type GroupMemberController = {
    /**
     * Return whether the specified contact is part of the member list.
     */
    readonly has: (contactUid: DbContactUid) => boolean;

    /**
     * Add multiple members to a group.
     * Triggered by interaction locally on this client.
     *
     * @throws if group or contact does not exist
     */
    readonly add: ControllerUpdateFromLocal<[contactUids: DbContactUid[]]>;

    /**
     * Remove multiple members from the group. Return the number of members that were actually
     * removed.
     */
    readonly remove: ControllerUpdateFromSource<[contactUids: DbContactUid[]], u53>;

    /**
     * Set member list to a specific state.
     * Triggered by synchronization.
     * Triggered by a remote update.
     *
     * This updates the differences in the database.
     */
    readonly set: Omit<ControllerUpdateFromSource<[contactUids: DbContactUid[]]>, 'fromLocal'>;

    /**
     * Return list of unique member identities (excluding the current user) and the creator.
     */
    readonly members: () => Set<LocalModelStore<Contact>>;
} & ProxyMarked;

/**
 * Groups storage
 */
export type GroupRepository = {
    /**
     * Add a group and handle the protocol flow according to the source.
     *
     * TODO(DESK-577): Handle the member list with models.
     *
     * @param init The group data
     * @param members The members list (including the creator)
     */
    readonly add: ControllerUpdateFromSource<
        [init: GroupInit, members: DbContactUid[]],
        LocalModelStore<Group>
    >;
    readonly getByUid: (uid: DbGroupUid) => LocalModelStore<Group> | undefined;

    /**
     * Fetches the group determined by the group creator and the `groupId`. Returns undefined if
     * such a group does not exist.
     */
    readonly getByGroupIdAndCreator: (
        groupId: GroupId,
        creator: GroupCreator,
    ) => LocalModelStore<Group> | undefined;
    readonly getAll: () => LocalSetStore<LocalModelStore<Group>>;
} & ProxyMarked;
