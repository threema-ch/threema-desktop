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
    readonly creatorIdentity: IdentityString;
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
    readonly members: IdentityString[];
}
export type GroupInit = Omit<GroupView, 'displayName' | 'members' | 'color'> &
    ConversationInitMixin;
export type GroupUpdate = Partial<
    Omit<
        GroupView,
        | 'groupId'
        | 'creatorIdentity'
        | 'createdAt'
        | 'displayName'
        | 'colorIndex'
        | 'color'
        | 'members'
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
     * Mark group membership as {@link GroupUserState.MEMBER}. This means that we were added to the
     * group by the creator.
     */
    readonly join: Omit<ControllerUpdateFromSource, 'fromLocal'>;
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
     * Return list of unique member identities (excluding the current user).
     */
    readonly identities: () => IdentityString[];
} & ProxyMarked;

/**
 * Groups storage
 */
export type GroupRepository = {
    /**
     * Add a group and handle the protocol flow according to the source.
     *
     * TODO(DESK-558): Handle the member list with models.
     *
     * @param init The group data
     * @param members The members list (including the creator)
     */
    readonly add: ControllerUpdateFromSource<
        [init: GroupInit, members: DbContactUid[]],
        LocalModelStore<Group>
    >;
    readonly getByUid: (uid: DbGroupUid) => LocalModelStore<Group> | undefined;
    readonly getByGroupIdAndCreator: (
        groupId: GroupId,
        creator: IdentityString,
    ) => LocalModelStore<Group> | undefined;
    readonly getAll: () => LocalSetStore<LocalModelStore<Group>>;
} & ProxyMarked;
