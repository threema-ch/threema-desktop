import type {
    DbContactUid,
    DbCreate,
    DbCreateConversationMixin,
    DbGroup,
    DbGroupUid,
    DbReceiverLookup,
} from '~/common/db';
import {Existence, GroupUserState, ReceiverType, TriggerSource} from '~/common/enum';
import type {Logger} from '~/common/logging';
import * as contact from '~/common/model/contact';
import type {ConversationModelStore} from '~/common/model/conversation';
import * as conversation from '~/common/model/conversation';
import type {GroupProfilePictureFields} from '~/common/model/profile-picture';
import type {ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {Conversation, ConversationUpdateFromToSync} from '~/common/model/types/conversation';
import type {
    Group,
    GroupController,
    GroupControllerHandle,
    GroupInit,
    GroupMemberController,
    GroupRepository,
    GroupUpdate,
    GroupUpdateFromLocal,
    GroupUpdateFromToSync,
    GroupView,
} from '~/common/model/types/group';
import type {ProfilePicture} from '~/common/model/types/profile-picture';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {ReflectGroupSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-group-sync-transaction';
import type {GroupId, IdentityString} from '~/common/network/types';
import {getNotificationTagForGroup, type NotificationTag} from '~/common/notification';
import type {Mutable, u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {idColorIndexToString} from '~/common/utils/id-color';
import {AsyncLock} from '~/common/utils/lock';
import {u64ToHexLe} from '~/common/utils/number';
import {
    createExactPropertyValidator,
    type Exact,
    OPTIONAL,
    REQUIRED,
} from '~/common/utils/property-validator';
import {SequenceNumberU53} from '~/common/utils/sequence-number';
import {LocalSetStore} from '~/common/utils/store/set-store';
import {getGraphemeClusters} from '~/common/utils/string';

let cache = new LocalModelStoreCache<DbGroupUid, LocalModelStore<Group>>();

const ensureExactGroupInit = createExactPropertyValidator<GroupInit>('GroupInit', {
    groupId: REQUIRED,
    creatorIdentity: REQUIRED,
    createdAt: REQUIRED,
    name: REQUIRED,
    colorIndex: REQUIRED,
    userState: REQUIRED,
    notificationTriggerPolicyOverride: OPTIONAL,
    notificationSoundPolicyOverride: OPTIONAL,
    lastUpdate: OPTIONAL,
    category: REQUIRED,
    visibility: REQUIRED,
});

const ensureExactGroupUpdate = createExactPropertyValidator<GroupUpdate>('GroupUpdate', {
    name: OPTIONAL,
    userState: OPTIONAL,
    notificationTriggerPolicyOverride: OPTIONAL,
    notificationSoundPolicyOverride: OPTIONAL,
});

const ensureExactGroupUpdateFromLocal = createExactPropertyValidator<GroupUpdateFromLocal>(
    'GroupUpdateFromLocal',
    {
        notificationTriggerPolicyOverride: OPTIONAL,
        notificationSoundPolicyOverride: OPTIONAL,
    },
);

const ensureExactGroupUpdateFromToSync = createExactPropertyValidator<GroupUpdateFromToSync>(
    'GroupUpdateFromToSync',
    {
        notificationTriggerPolicyOverride: OPTIONAL,
        notificationSoundPolicyOverride: OPTIONAL,
    },
);

/**
 * Get the display name of a group.
 */
export function getDisplayName(
    group: Pick<DbGroup, 'name' | 'creatorIdentity'>,
    groupMembers: IdentityString[],
    services: Pick<ServicesForModel, 'device'>,
): string {
    if (group.name !== '') {
        return group.name;
    }
    // Use members as fallback.
    //
    // Sorting: Creator first, then members, then our own identity last.
    // TODO(DESK-550): Use displayName of contact
    const memberIdentitiesSet = new Set(groupMembers);
    memberIdentitiesSet.delete(group.creatorIdentity);
    memberIdentitiesSet.delete(services.device.identity.string);
    const identities = [...memberIdentitiesSet.values()].sort(undefined);
    identities.unshift(group.creatorIdentity);
    identities.push(services.device.identity.string);
    return identities.join(', ');
}

/**
 * Determine the initials of the group.
 */
export function getGroupInitials(group: Pick<GroupView, 'name' | 'groupId'>): string {
    if (group.name.length > 0) {
        return getGraphemeClusters(group.name, 2).join('');
    }
    return u64ToHexLe(group.groupId).substring(0, 2);
}

/**
 * Add a group member entry.
 *
 * @throws if group or contact does not exist
 */
function addGroupMember(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactUid: DbContactUid,
): LocalModelStore<Contact> {
    const {db} = services;

    // Add membership - if the contact is not a member in the db already:
    if (!db.hasGroupMember(groupUid, contactUid)) {
        db.createGroupMember(groupUid, contactUid);
    }

    return contact.getByUid(services, contactUid, Existence.ENSURED);
}

/**
 * Add multiple group member entries.
 *
 * @throws if group or contact does not exist
 */
function addGroupMembers(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactUids: DbContactUid[],
): LocalModelStore<Contact>[] {
    return contactUids.map((contactUid) => addGroupMember(services, groupUid, contactUid));
}

/**
 * Remove a group member entry.
 *
 * @returns true if a membership was removed, false if it did not exist.
 */
function removeGroupMember(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactUid: DbContactUid,
): boolean {
    return services.db.removeGroupMember(groupUid, contactUid);
}

/**
 * Remove multiple group member entries.
 *
 * @throws if group or contact does not exist
 */
function removeGroupMembers(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactUids: DbContactUid[],
): [contactUid: DbContactUid, removed: boolean][] {
    return contactUids.map((contactUid) => [
        contactUid,
        removeGroupMember(services, groupUid, contactUid),
    ]);
}

/**
 * Retrieve the current group members from the database.
 * Note that this is not a store, so contact changes are not subscribed here.
 *
 * TODO(DESK-577): This will be superseded by a new store with this ticket.
 */
function getGroupMemberIdentities(
    services: ServicesForModel,
    groupUid: DbGroupUid,
): IdentityString[] {
    const {db, model} = services;
    const groupMembers = db.getAllGroupMemberContactUids(groupUid).map(({uid}) => uid);

    return [...model.contacts.getAll().get()]
        .filter(({ctx: currentContactUid}) => groupMembers.includes(currentContactUid))
        .map((modelStore) => modelStore.get().view.identity);
}

function create(
    services: ServicesForModel,
    init: Exact<GroupInit>,
    memberUids: DbContactUid[],
): LocalModelStore<Group> {
    const {db} = services;
    // Create the group
    const group: DbCreate<DbGroup> & DbCreateConversationMixin = {
        ...init,
        type: ReceiverType.GROUP,
    };
    const uid = db.createGroup(group);

    // Add members
    addGroupMembers(services, uid, memberUids);
    if (init.creatorIdentity !== services.device.identity.string) {
        // Ensure that admin is part of members as well
        // TODO(DESK-558): Remove this block
        const creatorUid = db.hasContactByIdentity(init.creatorIdentity);
        assert(creatorUid !== undefined, 'Creator UID not found when adding group');
        addGroupMember(services, uid, creatorUid);
    }
    const memberIdentities = getGroupMemberIdentities(services, uid);
    if (init.creatorIdentity !== services.device.identity.string) {
        // TODO(DESK-558): Remove this block
        assert(
            memberIdentities.includes(init.creatorIdentity),
            'Admin is not part of group members',
        );
    }
    const view = {
        ...group,
        displayName: getDisplayName({...group}, memberIdentities, services),
        members: memberIdentities,
        color: idColorIndexToString(group.colorIndex),
    };

    // Extract profile picture fields
    const profilePictureData: GroupProfilePictureFields = {
        colorIndex: group.colorIndex,
        profilePictureAdminDefined: group.profilePictureAdminDefined,
    };

    const groupStore = cache.add(
        uid,
        () => new GroupModelStore(services, view, uid, profilePictureData),
    );

    // Fetching the conversation implicitly updates the conversation set store and cache.
    groupStore.get().controller.conversation();

    return groupStore;
}

function update(services: ServicesForModel, uid: DbGroupUid, change: Exact<GroupUpdate>): void {
    const {db} = services;

    // Update the group
    db.updateGroup({...change, uid});
}

function remove(services: ServicesForModel, uid: DbGroupUid): void {
    const {db} = services;

    // Remove the group
    //
    // Note: This implicitly removes the associated conversation and all of its associated
    //       messages.
    db.removeGroup(uid);
    cache.remove(uid);
}

// Function overload with constrained return type based on existence.
export function getByUid<TExistence extends Existence>(
    services: ServicesForModel,
    uid: DbGroupUid,
    existence: TExistence,
): TExistence extends Existence.ENSURED
    ? LocalModelStore<Group>
    : LocalModelStore<Group> | undefined;

/**
 * Fetch a group model by its database UID.
 */
export function getByUid(
    services: ServicesForModel,
    uid: DbGroupUid,
    existence: Existence,
): LocalModelStore<Group> | undefined {
    return cache.getOrAdd(uid, () => {
        const {db} = services;

        // Lookup the group
        const group = db.getGroupByUid(uid);
        if (existence === Existence.ENSURED) {
            assert(group !== undefined, `Expected group with UID ${uid} to exist`);
        } else if (group === undefined) {
            return undefined;
        }

        // Look up members
        const memberIdentities = getGroupMemberIdentities(services, uid);
        const view = {
            ...group,
            displayName: getDisplayName(group, memberIdentities, services),
            members: memberIdentities,
            color: idColorIndexToString(group.colorIndex),
        };

        // Extract profile picture fields
        const profilePictureData: GroupProfilePictureFields = {
            colorIndex: group.colorIndex,
            profilePictureAdminDefined: group.profilePictureAdminDefined,
        };

        // Create a store
        return new GroupModelStore(services, view, uid, profilePictureData);
    });
}

function getByGroupIdAndCreator(
    services: ServicesForModel,
    id: GroupId,
    creator: IdentityString,
): LocalModelStore<Group> | undefined {
    const {db} = services;

    // Check if the group exists, then return the store
    const uid = db.hasGroupByIdAndCreator(id, creator);
    if (uid === undefined) {
        return undefined;
    }
    return getByUid(services, uid, Existence.ENSURED);
}

function all(services: ServicesForModel): LocalSetStore<LocalModelStore<Group>> {
    // TODO(DESK-543): Remove this mock and implement it correctly :)
    return cache.setRef.derefOrCreate(() => {
        const {db, logging} = services;
        // Note: This may be inefficient. It would be more efficient to get all UIDs, then filter
        // out all UIDs we have cached stores for and then make an aggregated request for the
        // remaining ones.
        const stores = db
            .getAllGroupUids()
            .map(({uid}) => getByUid(services, uid, Existence.ENSURED));
        const tag = `group[]`;
        return new LocalSetStore(new Set(stores), {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    });
}

/** @inheritdoc */
class GroupMemberModelController implements GroupMemberController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    /** @inheritdoc */
    public readonly add: GroupMemberController['add'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (contactUids: DbContactUid[]) => {
            this._log.debug('GroupMemberModelController: Add members from local');
            if (contactUids.length === 0) {
                return;
            }
            this._add(contactUids);
            this._addGroupStatusMessage(contactUids, []);
        },
    };

    /** @inheritdoc */
    public readonly remove: GroupMemberController['remove'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (contactUids: DbContactUid[]) => {
            this._log.debug('GroupMemberModelController: Remove members from local');
            if (contactUids.length === 0) {
                return 0;
            }
            const count = this._remove(contactUids);
            this._addGroupStatusMessage([], contactUids);
            return count;
        },
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            contactUids: DbContactUid[],
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => {
            this._log.debug('GroupMemberModelController: Remove members from remote');
            if (contactUids.length === 0) {
                return 0;
            }
            const count = this._remove(contactUids);
            this._addGroupStatusMessage([], contactUids);
            return count;
        },
        fromSync: (contactUids: DbContactUid[]) => {
            this._log.debug('GroupMemberModelController: Remove members from sync');
            if (contactUids.length === 0) {
                return 0;
            }
            const count = this._remove(contactUids);
            this._addGroupStatusMessage([], contactUids);
            return count;
        },
    };

    /** @inheritdoc */
    public readonly set: GroupMemberController['set'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (contactUids: DbContactUid[]) => {
            this._log.debug('GroupMemberModelController: Set members from sync');
            const [added, removed] = this._diff(contactUids);
            if (added.length === 0 && removed.length === 0) {
                return;
            }
            this._set(added, removed);
            this._addGroupStatusMessage(added, removed);
        },
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            contactUids: DbContactUid[],
            // eslint-disable-next-line @typescript-eslint/require-await
        ) => {
            this._log.debug('GroupMemberModelController: Set members from remote');
            const [added, removed] = this._diff(contactUids);
            if (added.length === 0 && removed.length === 0) {
                return;
            }
            this._set(added, removed);
            this._addGroupStatusMessage(added, removed);
        },
    };

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _group: GroupControllerHandle,
        private readonly _meta: ModelLifetimeGuard<GroupView>,
    ) {
        this._log = _services.logging.logger(`model.group.${_group.uid}.members`);
    }

    /** @inheritdoc */
    public has(contactUid: DbContactUid): boolean {
        const {db} = this._services;
        return db.hasGroupMember(this._group.uid, contactUid);
    }

    /** @inheritdoc */
    public identities(): IdentityString[] {
        return getGroupMemberIdentities(this._services, this._group.uid);
    }

    private _add(contactUids: DbContactUid[]): void {
        this._meta.update((view) => {
            addGroupMembers(this._services, this._group.uid, contactUids);
            this._group.version.next();
            Object.assign(view, {
                members: getGroupMemberIdentities(this._services, this._group.uid),
            });
            return view;
        });
    }

    /**
     * Remove the specified contacts from the group member list.
     *
     * Return the number of contacts that were previously part of the group and that were removed.
     */
    private _remove(contactUids: DbContactUid[]): u53 {
        let removedCount = 0;
        this._meta.update((view) => {
            const removalInfo = removeGroupMembers(this._services, this._group.uid, contactUids);
            removedCount = removalInfo
                .map(([_, removed]) => (removed ? 1 : 0) as u53)
                .reduce((total, current) => total + current, 0);
            if (removedCount > 0) {
                this._group.version.next();
                Object.assign(view, {
                    members: getGroupMemberIdentities(this._services, this._group.uid),
                });
            }
            return view;
        });
        return removedCount;
    }

    /**
     * Calculate difference between {@param contactUids} and the database state.
     */
    private _diff(contactUids: DbContactUid[]): [added: DbContactUid[], removed: DbContactUid[]] {
        // Get current group members
        const currentGroupMembers = this._services.db.getAllGroupMemberContactUids(this._group.uid);
        const added = contactUids.filter(
            (contactUid) =>
                currentGroupMembers.find(
                    ({uid: currentMemberUid}) => currentMemberUid === contactUid,
                ) === undefined,
        );
        const removed = currentGroupMembers
            .map(({uid}) => uid)
            .filter(
                (currentMemberUid) =>
                    contactUids.find((contactUid) => contactUid === currentMemberUid) === undefined,
            );

        return [added, removed];
    }

    private _set(added: DbContactUid[], removed: DbContactUid[]): void {
        this._remove(removed);
        this._add(added);
    }

    private _addGroupStatusMessage(added: DbContactUid[], removed: DbContactUid[]): void {
        const group = getByUid(this._services, this._group.uid, Existence.ENSURED);
        const groupConversation = group.get().controller.conversation().get();
        const createdAt = new Date();
        groupConversation.controller.createStatusMessage({
            type: 'group-member-change',
            value: {
                added: added.map(
                    (uid) =>
                        contact.getByUid(this._services, uid, Existence.ENSURED).get().view
                            .identity,
                ),
                removed: removed.map(
                    (uid) =>
                        contact.getByUid(this._services, uid, Existence.ENSURED).get().view
                            .identity,
                ),
            },
            createdAt,
        });
    }
}

/** @inheritdoc */
export class GroupModelController implements GroupController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<GroupView>();
    public readonly notificationTag: NotificationTag;

    /** @inheritdoc */
    public readonly members: GroupMemberModelController;

    /** @inheritdoc */
    public readonly profilePicture: LocalModelStore<ProfilePicture>;

    /** @inheritdoc */
    public readonly update: GroupController['update'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (change: GroupUpdateFromLocal) => {
            this._log.debug('GroupModelController: Update from local');
            const validatedChange = ensureExactGroupUpdateFromLocal(change);
            const groupUpdate = ensureExactGroupUpdateFromToSync(validatedChange);
            const conversationUpdate = {};
            await this._reflectAndCommit(
                groupUpdate,
                conversationUpdate,
                {source: TriggerSource.LOCAL},
                () => this._update(validatedChange),
            );
        },
        fromSync: (change: GroupUpdateFromToSync) => {
            this._log.debug('GroupModelController: Update from sync');
            this._update(ensureExactGroupUpdateFromToSync(change));
        },
    };

    /** @inheritdoc */
    public readonly name: GroupController['name'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (name) => {
            this._log.debug('GroupModelController: Change name from local');
            const oldName = this.meta.run((h) =>
                h.view().name === '' ? '' : h.view().displayName,
            );
            this._update({name});
            const createdAt = new Date();
            if (oldName !== name) {
                this.conversation()
                    .get()
                    .controller.createStatusMessage({
                        type: 'group-name-change',
                        value: {
                            oldName,
                            newName: name,
                        },
                        createdAt,
                    });
            }
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, name) => {
            this._log.debug('GroupModelController: Change name from remote');
            const oldName = this.meta.run((h) =>
                h.view().name === '' ? '' : h.view().displayName,
            );
            this._update({name});
            const createdAt = new Date();
            if (oldName !== name) {
                this.conversation()
                    .get()
                    .controller.createStatusMessage({
                        type: 'group-name-change',
                        value: {
                            oldName,
                            newName: name,
                        },
                        createdAt,
                    });
            }
        },
        fromSync: (name: string) => {
            this._log.debug('GroupModelController: Change name from sync');
            const oldName = this.meta.run((h) =>
                h.view().name === '' ? '' : h.view().displayName,
            );
            this._update({name});
            const createdAt = new Date();
            if (oldName !== name) {
                this.conversation()
                    .get()
                    .controller.createStatusMessage({
                        type: 'group-name-change',
                        value: {
                            oldName,
                            newName: name,
                        },
                        createdAt,
                    });
            }
        },
    };

    /** @inheritdoc */
    public readonly remove: GroupController['remove'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async () => {
            this._log.debug('GroupModelController: Remove from local');
            // TODO(DESK-551): Remove Group and sync to D2D
            await Promise.resolve();
        },
        fromSync: () => {
            this._log.debug('GroupModelController: Remove from sync');
            // TODO(DESK-551): Remove Group
        },
    };

    /** @inheritdoc */
    public readonly kick: GroupController['kick'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle) => {
            this._log.debug('GroupModelController: Kicked from remote');
            // TODO(DESK-551): Implement
            this._update({userState: GroupUserState.KICKED});
        },
        fromSync: () => {
            this._log.debug('GroupModelController: Kicked from sync');
            this._update({userState: GroupUserState.KICKED});
        },
    };

    /** @inheritdoc */
    public readonly leave: GroupController['leave'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async () => {
            this._log.debug('GroupModelController: Leave from local');
            // TODO(DESK-551): Implement
            this._update({userState: GroupUserState.LEFT});
        },
        fromSync: () => {
            this._log.debug('GroupModelController: Leave from sync');
            this._update({userState: GroupUserState.LEFT});
        },
    };

    /** @inheritdoc */
    public readonly dissolve: GroupController['dissolve'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: () => {
            this._log.debug('GroupModelController: Dissolve from sync');
            this._update({userState: GroupUserState.LEFT});
        },
    };

    /** @inheritdoc */
    public readonly join: GroupController['join'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle) => {
            this._log.debug('GroupModelController: Join from remote');
            // TODO(DESK-551): Implement
            this._update({userState: GroupUserState.MEMBER});
        },
        fromSync: () => {
            this._log.debug('GroupModelController: Join from sync');
            this._update({userState: GroupUserState.MEMBER});
        },
    };

    private readonly _log: Logger;
    private readonly _groupDebugString: string;
    private readonly _lookup: DbReceiverLookup;

    /**
     * A version counter that should be incremented for every group update.
     */
    private readonly _versionSequence = new SequenceNumberU53<u53>(0);

    /**
     * Async lock for group updates.
     */
    private readonly _lock = new AsyncLock();

    /**
     * Instantiate the GroupModelController.
     *
     * IMPORTANT: The caller must ensure that `uid` and `_identity` arguments both refer to the same
     *            group, otherwise the behavior is undefined.
     */
    public constructor(
        private readonly _services: ServicesForModel,
        public readonly uid: DbGroupUid,
        private readonly _creator: IdentityString,
        private readonly _groupId: GroupId,
        initialProfilePictureData: GroupProfilePictureFields,
    ) {
        this._lookup = {
            type: ReceiverType.GROUP,
            uid: this.uid,
        };
        this._groupDebugString = groupDebugString(_creator, _groupId);
        this._log = _services.logging.logger(`model.group.${uid}`);
        this.notificationTag = getNotificationTagForGroup(_creator, _groupId);
        this.members = new GroupMemberModelController(
            _services,
            {
                uid,
                debugString: this._groupDebugString,
                version: this._versionSequence,
            },
            this.meta,
        );
        this.profilePicture = this._services.model.profilePictures.getForGroup(
            this.uid,
            this._creator,
            this._groupId,
            initialProfilePictureData,
        );
    }

    /** @inheritdoc */
    public conversation(): LocalModelStore<Conversation> {
        return this._conversation();
    }

    /**
     * Locally update the group and increment the version counter.
     */
    private _update(change: GroupUpdate): void {
        this.meta.update(() => {
            update(this._services, this.uid, ensureExactGroupUpdate(change));
            this._versionSequence.next();
            const derivedChange: Mutable<Partial<GroupView>, 'displayName'> = {...change};

            const identities = getGroupMemberIdentities(this._services, this.uid);

            // Update display name, if necessary
            if (derivedChange.name !== undefined) {
                derivedChange.displayName = getDisplayName(
                    {
                        name: derivedChange.name,
                        creatorIdentity: this._creator,
                    },
                    identities,
                    this._services,
                );
            }

            return derivedChange;
        });
    }

    /**
     * Reflect the group change to other devices via D2D in a transaction. If that succeeded, run
     * the commit function.
     */
    private async _reflectAndCommit(
        groupUpdate: GroupUpdateFromToSync,
        conversationUpdate: ConversationUpdateFromToSync,
        scope:
            | {source: TriggerSource.LOCAL}
            | {source: TriggerSource.REMOTE; handle: ActiveTaskCodecHandle<'volatile'>},
        commitToDatabase: () => void,
    ): Promise<void> {
        const {taskManager} = this._services;

        await this._lock.with(async () => {
            // Precondition: The group was not updated in the meantime
            const currentVersion = this._versionSequence.current;
            const precondition = (): boolean => this._versionSequence.current === currentVersion;

            // Create task to group change to other devices inside a transaction
            this._log.debug(`Syncing group data to other devices`);
            const syncTask = new ReflectGroupSyncTransactionTask(this._services, precondition, {
                type: 'update',
                groupId: this._groupId,
                creatorIdentity: this._creator,
                group: groupUpdate,
                conversation: conversationUpdate,
            });

            // Run task
            let result;
            switch (scope.source) {
                case TriggerSource.LOCAL:
                    result = await taskManager.schedule(syncTask);
                    break;
                case TriggerSource.REMOTE:
                    result = await syncTask.run(scope.handle);
                    break;
                default:
                    unreachable(scope);
            }

            // Commit update
            switch (result) {
                case 'success':
                    commitToDatabase();
                    break;
                case 'aborted':
                    // Synchronization conflict, group changed in the meantime
                    throw new Error('Failed to update group due to synchronization conflict');
                default:
                    unreachable(result);
            }
        });
    }

    /**
     * Locally remove the group, deactivate and purge the conversation and all of its messages
     * from their respective caches, and remove the conversation and all of its messages in the
     * database. The group may not be part of any groups at this point.
     */
    // TODO(DESK-551)
    private _remove(): void {
        this.meta.deactivate(() => {
            // Deactivate and purge the conversation and all of its messages
            // from their respective caches
            conversation.deactivateAndPurgeCacheCascade(this._lookup, this.conversation());

            // Now, remove the group. This implicitly removes the
            // conversation and all of its messages in the database.
            remove(this._services, this.uid);
        });
    }

    private _conversation(): ConversationModelStore {
        return this.meta.run(() =>
            conversation.getByReceiver(
                this._services,
                this._lookup,
                // Safe because the executor context ensures that the group exists, therefore
                // an associated conversation must also exist.
                Existence.ENSURED,
                this._groupDebugString,
            ),
        );
    }
}

/** @inheritdoc */
export class GroupModelStore extends LocalModelStore<Group> {
    /**
     * Instantiate the GroupModelStore.
     *
     * IMPORTANT: The caller must ensure that `group` and `uid` arguments both refer to the same
     *            group, otherwise the behavior is undefined.
     */
    public constructor(
        services: ServicesForModel,
        group: GroupView,
        uid: DbGroupUid,
        initialGrofilePictureData: GroupProfilePictureFields,
    ) {
        const {logging} = services;
        const tag = `group.${uid}`;
        super(
            group,
            new GroupModelController(
                services,
                uid,
                group.creatorIdentity,
                group.groupId,
                initialGrofilePictureData,
            ),
            uid,
            ReceiverType.GROUP,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

/** @inheritdoc */
export class GroupModelRepository implements GroupRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public readonly add: GroupRepository['add'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (init: GroupInit, members: DbContactUid[]) => {
            this._log.debug('Add group from local');
            return create(this._services, ensureExactGroupInit(init), members);
        },

        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, init: GroupInit, members: DbContactUid[]) => {
            this._log.debug('Add group from remote');
            return create(this._services, ensureExactGroupInit(init), members);
        },

        fromSync: (init: GroupInit, members: DbContactUid[]) => {
            this._log.debug('Add group from sync');
            return create(this._services, ensureExactGroupInit(init), members);
        },
    };

    private readonly _log: Logger;

    public constructor(private readonly _services: ServicesForModel) {
        this._log = _services.logging.logger('model.group-repository');

        // TODO(DESK-697): This is a quick workaround to make some tests work,
        // but should be probably a private class attribute (not a trivial change as of now), or maybe be
        // moved down to DB level. This case was the origin of DESK-697.
        this._log.debug('Creating new cache');
        cache = new LocalModelStoreCache<DbGroupUid, LocalModelStore<Group>>();
    }

    /** @inheritdoc */
    public getByUid(uid: DbGroupUid): LocalModelStore<Group> | undefined {
        return getByUid(this._services, uid, Existence.UNKNOWN);
    }

    /** @inheritdoc */
    public getByGroupIdAndCreator(
        id: GroupId,
        creator: IdentityString,
    ): LocalModelStore<Group> | undefined {
        return getByGroupIdAndCreator(this._services, id, creator);
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<LocalModelStore<Group>> {
        return all(this._services);
    }
}

/**
 * Return a debug string to identify this group
 *
 * It consists of the string `<creator-identity>.<group-id-hex>`.
 */
export function groupDebugString(creator: IdentityString, groupId: GroupId): string {
    return `${creator}.${u64ToHexLe(groupId)}`;
}
