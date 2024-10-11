import type {DbGroup, DbGroupUid, DbList, DbRunningGroupCall, UidOf} from '~/common/db';
import type {
    GroupNotificationTriggerPolicy,
    GroupUserState,
    NotificationSoundPolicy,
    ReceiverType,
} from '~/common/enum';
import type {GroupModelStore} from '~/common/model/group';
import type {OngoingGroupCall} from '~/common/model/group-call';
import type {
    ControllerUpdate,
    ControllerUpdateFromLocal,
    ControllerUpdateFromSource,
    ControllerUpdateFromSync,
    Model,
} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {ConversationInitMixin} from '~/common/model/types/conversation';
import type {ProfilePicture} from '~/common/model/types/profile-picture';
import type {ReceiverController} from '~/common/model/types/receiver';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {ChosenGroupCall, GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import type {SfuToken} from '~/common/network/protocol/directory';
import type {GroupId, IdentityString} from '~/common/network/types';
import type {u8, u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {IdColor} from '~/common/utils/id-color';
import type {SequenceNumberU53} from '~/common/utils/sequence-number';
import type {AbortListener} from '~/common/utils/signal';
import type {ReadableStore} from '~/common/utils/store';
import type {LocalSetStore} from '~/common/utils/store/set-store';

export interface GroupView {
    readonly groupId: GroupId;
    readonly creator: ModelStore<Contact> | 'me';
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
     * Contains all members of the group except
     *
     * - the creator, and
     * - the user itself (the user's membership must be checked via `userState`).
     */
    readonly members: Set<ModelStore<Contact>>;
}

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

    readonly lifetimeGuard: ModelLifetimeGuard<GroupView>;

    /**
     * Current _chosen_ group call (if any).
     */
    readonly call: ReadableStore<ChosenGroupCall | undefined>;

    /**
     * Add given contacts to the group (if they are not in it already).
     *
     * Returns the number of added contacts.
     *
     * Note: If the creator is in the list, it will be ignored.
     */
    readonly addMembers: ControllerUpdateFromLocal<
        [contacts: ModelStore<Contact>[], createdAt: Date],
        u53
    >;

    /**
     * Remove the given contacts from a group (if they are in it).
     *
     * Returns the number of removed contacts.
     *
     * Note: If the creator is in the list, it will be ignored.
     */
    readonly removeMembers: ControllerUpdateFromSource<
        [contacts: ModelStore<Contact>[], createdAt: Date],
        u53
    >;

    /**
     * Set the group member.
     *
     * This function calculates the diff of the given contacts towards the group. To that end, it
     * will add all contacts that are not in the group yet to the group and remove the ones that are
     * current members of the group but not in the {@link contacts} list.
     *
     * If `newUserState` is set, the user will be added to the group (if they were not previously a
     * member).
     *
     * Note: If the creator is in the list, it will be ignored.
     *
     * @returns the number of added and removed contacts.
     */
    readonly setMembers: Omit<
        ControllerUpdate<
            [
                contacts: ModelStore<Contact>[],
                createdAt: Date,
                newUserState?: GroupUserState.MEMBER,
            ],
            {added: u53; removed: u53}
        >,
        'fromLocal'
    >;

    /**
     * Update group properties that only come from a sync or only trigger a sync (i.e. no CSP
     * messages).
     */
    readonly update: ControllerUpdateFromSync<[update: GroupUpdateFromToSync]> &
        ControllerUpdateFromLocal<[update: GroupUpdateFromLocal]>;

    /**
     * Update a group's name.
     */
    readonly name: ControllerUpdateFromSource<[name: string, createdAt: Date]>;

    /**
     * Remove the group and the corresponding conversation, and deactivate the controller. In case
     * the remove is called locally, sync the update to other devices.
     */
    readonly remove: Omit<ControllerUpdateFromSource, 'fromRemote'>;

    /**
     * Mark group membership as {@link GroupUserState.KICKED}. This means that we were removed from
     * the group by the creator.
     */
    readonly kicked: Omit<ControllerUpdate<[createdAt: Date]>, 'fromLocal'>;

    /**
     * Mark group membership as {@link GroupUserState.LEFT}. This means that we left the group.
     */
    readonly leave: Omit<ControllerUpdateFromSource<[createdAt: Date]>, 'fromRemote'>;

    /**
     * Dissolve a group that we created.
     */
    readonly dissolve: Omit<ControllerUpdateFromSource, 'fromLocal' | 'fromRemote'>;

    /**
     * Returns true if the given contact is a member (or the creator) of this group.
     */
    readonly hasMember: (contact: ModelStore<Contact> | 'me') => boolean;

    /**
     * Register a group call received from a remote or reflected `GroupCallStart` message.
     */
    readonly registerCall: Omit<ControllerUpdateFromSource<[call: GroupCallBaseData]>, 'fromLocal'>;

    /**
     * Initialize the currently running calls as provided by the database.
     */
    readonly initializeCalls: (runningCalls: DbList<DbRunningGroupCall>) => void;

    /**
     * Run the _Group Call Refresh Steps_ for this group.
     *
     * @param token A pre-acquired SFU token, if any.
     * @returns the chosen call, if any.
     */
    readonly refreshCall: (token: SfuToken | undefined) => Promise<ChosenGroupCall | undefined>;

    /**
     * Join an existing group call (intent `'join'`), or join or create a new group call and
     * potentially send a `GroupCallStart` message (intent `'join-or-create'`).
     *
     * @throws {GroupCallError} if the user is participating in another group call, or if the user
     *   is not a member of the group or the call could not be joined for any other reason.
     */
    readonly joinCall: <TIntent = 'join' | 'join-or-create'>(
        intent: TIntent,
        cancel: AbortListener<unknown>,
    ) => Promise<TIntent extends 'join' ? OngoingGroupCall | undefined : OngoingGroupCall>;
} & ProxyMarked;
export interface GroupControllerHandle {
    /**
     * UID of the group.
     */
    readonly uid: UidOf<DbGroup>;

    /** Reference to the associated group model store. */
    readonly store: () => GroupModelStore;

    /**
     * Debug string of the group.
     */
    readonly debugString: string;

    /**
     * Group version counter that should be incremented for every group update.
     */
    readonly version: SequenceNumberU53<u53>;
}

export type Group = Model<GroupView, GroupController, UidOf<DbGroup>, ReceiverType.GROUP>;

/**
 * Groups storage
 */
export type GroupRepository = {
    /**
     * Add a group and handle the protocol flow according to the source.
     *
     * @param init The group data
     * @param members The members list (including the creator)
     */
    readonly add: ControllerUpdate<
        [init: GroupInit, members: ModelStore<Contact>[]],
        ModelStore<Group>
    >;

    /**
     * Return the `ModelStore` of a group.
     *
     * Note: The group view is not transferrable, therefore, this function cannot be called from the
     * frontend.
     */
    readonly getByUid: (uid: DbGroupUid) => ModelStore<Group> | undefined;

    /**
     * Return the profile picture of a group.
     *
     * Returns undefined if the group was not found.
     */
    readonly getProfilePicture: (uid: DbGroupUid) => ModelStore<ProfilePicture> | undefined;

    /**
     * Fetches the group determined by the group creator and the `groupId`. Returns undefined if
     * such a group does not exist.
     *
     * Note: The group view is not transferrable, therefore, this function cannot be called from the
     * frontend.
     */
    readonly getByGroupIdAndCreator: (
        groupId: GroupId,
        creatorIdentity: IdentityString,
    ) => ModelStore<Group> | undefined;
    readonly getAll: () => LocalSetStore<ModelStore<Group>>;
} & ProxyMarked;
