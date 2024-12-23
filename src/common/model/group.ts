import type {
    DbContactUid,
    DbCreate,
    DbCreateConversationMixin,
    DbGroup,
    DbGroupUid,
    DbList,
    DbReceiverLookup,
    DbRunningGroupCall,
} from '~/common/db';
import {
    Existence,
    GroupCallPolicy,
    GroupUserState,
    ReceiverType,
    StatusMessageType,
    TriggerSource,
} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import * as contact from '~/common/model/contact';
import type {ConversationModelStore} from '~/common/model/conversation';
import * as conversation from '~/common/model/conversation';
import type {OngoingGroupCall} from '~/common/model/group-call';
import type {GroupProfilePictureFields} from '~/common/model/profile-picture';
import type {GuardedStoreHandle, ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {Conversation, ConversationUpdateFromToSync} from '~/common/model/types/conversation';
import type {
    Group,
    GroupController,
    GroupInit,
    GroupRepository,
    GroupUpdate,
    GroupUpdateFromLocal,
    GroupUpdateFromToSync,
    GroupView,
} from '~/common/model/types/group';
import type {ProfilePicture} from '~/common/model/types/profile-picture';
import {ModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {
    deserializeRunningGroupCall,
    type ChosenGroupCall,
    type RunningGroupCall,
} from '~/common/network/protocol/call/group-call';
import type {SfuToken} from '~/common/network/protocol/directory';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingGroupCallStartTask} from '~/common/network/protocol/task/csp/outgoing-group-call-start';
import {ReflectGroupSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-group-sync-transaction';
import type {GroupId, IdentityString} from '~/common/network/types';
import {getNotificationTagForGroup, type NotificationTag} from '~/common/notification';
import type {Mutable, u53} from '~/common/types';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {byteEquals} from '~/common/utils/byte';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {idColorIndexToString} from '~/common/utils/id-color';
import {AsyncLock} from '~/common/utils/lock';
import {u64ToHexLe} from '~/common/utils/number';
import {omit} from '~/common/utils/object';
import {
    createExactPropertyValidator,
    type Exact,
    OPTIONAL,
    REQUIRED,
} from '~/common/utils/property-validator';
import {SequenceNumberU53} from '~/common/utils/sequence-number';
import {difference} from '~/common/utils/set';
import type {AbortListener} from '~/common/utils/signal';
import {WritableStore, type ReadableStore} from '~/common/utils/store';
import {LocalSetStore} from '~/common/utils/store/set-store';
import {getGraphemeClusters} from '~/common/utils/string';

let cache = new ModelStoreCache<DbGroupUid, ModelStore<Group>>();

const ensureExactGroupInit = createExactPropertyValidator<GroupInit>('GroupInit', {
    groupId: REQUIRED,
    creator: REQUIRED,
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
    groupName: string,
    userState: GroupUserState,
    creator: ModelStore<Contact> | 'me',
    groupMembers: Set<ModelStore<Contact>>,
    services: Pick<ServicesForModel, 'device' | 'model'>,
): string {
    if (groupName !== '') {
        return groupName;
    }

    // Use members as fallback.
    //
    // Sorting: Creator first, then members, then our own user last.
    const memberNames = [...groupMembers]
        .map((member) => member.get().view.displayName)
        .sort((a, b) => a.localeCompare(b));
    if (creator !== 'me') {
        memberNames.unshift(creator.get().view.displayName);
    }

    // TODO(DESK-1570) Move this to correctly display the user with the 'Me' string.
    if (userState === GroupUserState.MEMBER) {
        memberNames.push(
            services.model.user.profileSettings.get().view.nickname ??
                services.device.identity.string,
        );
    }
    return memberNames.join(', ');
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
 * Note: If the `DbContactUid` is the creator of the group or is already in the member list, no
 * database operation will be performed.
 */
function addGroupMember(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactToAdd: ModelStore<Contact>,
): u53 {
    const {db} = services;
    // Add membership - if the contact is not a member in the db already
    return db.createGroupMember(groupUid, contactToAdd.ctx);
}

/**
 * Add multiple group member entries.
 *
 * Returns the number of members that were added.
 *
 * TODO(DESK-1465): Don't loop here but only have a single query.
 */
function addGroupMembers(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactsToAdd: ModelStore<Contact>[],
): u53 {
    return contactsToAdd.reduce(
        (count, contactToAdd) => count + addGroupMember(services, groupUid, contactToAdd),
        0,
    );
}

/**
 * Return all group members, excluding the creator.
 */
function getGroupMembers(
    services: ServicesForModel,
    groupUid: DbGroupUid,
): Set<ModelStore<Contact>> {
    const memberUids = services.db.getAllGroupMemberContactUids(groupUid);
    return new Set(
        memberUids.map((member) => contact.getByUid(services, member.uid, Existence.ENSURED)),
    );
}

/**
 * Remove a group member from a group.
 *
 * @returns 1 if member was removed, or 0 if contact was not in the member list.
 */
function removeGroupMember(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactToRemove: ModelStore<Contact>,
): u53 {
    return services.db.removeGroupMember(groupUid, contactToRemove.ctx);
}

/**
 * Remove multiple group member from a group.
 *
 * Returns the number of removed group members.
 *
 * TODO(DESK-1465): Don't loop here but only have a single query.
 */
function removeGroupMembers(
    services: ServicesForModel,
    groupUid: DbGroupUid,
    contactsToRemove: ModelStore<Contact>[],
): u53 {
    return contactsToRemove.reduce(
        (count, contactToRemove) => count + removeGroupMember(services, groupUid, contactToRemove),
        0,
    );
}

function create(
    services: ServicesForModel,
    init: Exact<GroupInit>,
    members: ModelStore<Contact>[],
): ModelStore<Group> {
    const {db} = services;

    let creatorUid: DbContactUid | undefined = undefined;
    if (init.creator !== 'me') {
        // Ensure that the creator exists in the database already.
        creatorUid = db.hasContactByIdentity(init.creator.get().view.identity);
        assert(creatorUid !== undefined, 'Creator UID not found when adding group');
    }

    // Create the group
    const group: DbCreate<DbGroup> & DbCreateConversationMixin = {
        ...omit(init, ['creator']),
        type: ReceiverType.GROUP,
        creatorUid,
    };
    const uid = db.createGroup(group);

    // Add members
    addGroupMembers(services, uid, members);
    const processedMembers = getGroupMembers(services, uid);

    // Create view
    const view: GroupView = {
        color: idColorIndexToString(group.colorIndex),
        colorIndex: group.colorIndex,
        createdAt: group.createdAt,
        creator: init.creator,
        groupId: group.groupId,
        name: group.name,
        userState: group.userState,
        notificationSoundPolicyOverride: group.notificationSoundPolicyOverride,
        notificationTriggerPolicyOverride: group.notificationTriggerPolicyOverride,
        displayName: getDisplayName(
            group.name,
            group.userState,
            init.creator,
            processedMembers,
            services,
        ),
        members: processedMembers,
    };

    // Extract profile picture fields
    const profilePictureData: GroupProfilePictureFields = {
        colorIndex: group.colorIndex,
        profilePictureAdminDefined: group.profilePictureAdminDefined,
    };

    // Add to cache and create store
    const groupStore = cache.add(
        uid,
        () => new GroupModelStore(services, view, uid, [], profilePictureData),
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
): TExistence extends Existence.ENSURED ? ModelStore<Group> : ModelStore<Group> | undefined;

/**
 * Fetch a group model by its database UID.
 */
export function getByUid(
    services: ServicesForModel,
    uid: DbGroupUid,
    existence: Existence,
): ModelStore<Group> | undefined {
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
        const members = getGroupMembers(services, uid);
        const creator =
            group.creatorUid === undefined
                ? 'me'
                : contact.getByUid(services, group.creatorUid, Existence.ENSURED);

        const view: GroupView = {
            ...group,
            color: idColorIndexToString(group.colorIndex),
            creator,
            displayName: getDisplayName(group.name, group.userState, creator, members, services),
            members,
        };

        // Extract profile picture fields
        const profilePictureData: GroupProfilePictureFields = {
            colorIndex: group.colorIndex,
            profilePictureAdminDefined: group.profilePictureAdminDefined,
        };

        // Load currently running group calls, if any.
        const runningGroupCalls = services.db.getRunningGroupCalls(uid);

        // Create a store
        return new GroupModelStore(services, view, uid, runningGroupCalls, profilePictureData);
    });
}

function getByGroupIdAndCreator(
    services: ServicesForModel,
    id: GroupId,
    creatorIdentity: IdentityString,
): ModelStore<Group> | undefined {
    const {db} = services;

    let contactUid: DbContactUid | undefined = undefined;
    if (creatorIdentity !== services.device.identity.string) {
        contactUid = db.hasContactByIdentity(creatorIdentity);
        if (contactUid === undefined) {
            return undefined;
        }
    }

    // Check if the group exists, then return the store
    const uid = db.hasGroupByIdAndCreatorUid(id, contactUid);
    if (uid === undefined) {
        return undefined;
    }
    return getByUid(services, uid, Existence.ENSURED);
}

function all(services: ServicesForModel): LocalSetStore<ModelStore<Group>> {
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
export class GroupModelController implements GroupController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<GroupView>();
    public readonly notificationTag: NotificationTag;

    /** @inheritdoc */
    public readonly profilePicture: ModelStore<ProfilePicture>;

    public readonly addMembers: GroupController['addMembers'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // TODO(DESK-165): Reflect changes here.
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (contacts: ModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Add members from local');
            return this.lifetimeGuard.run((handle) => {
                const numAdded = this._addMembers(handle, contacts, createdAt);
                if (numAdded > 0) {
                    this._versionSequence.next();
                }
                return numAdded;
            });
        },
    };

    /** @inheritdoc */
    public readonly removeMembers: GroupController['removeMembers'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        // TODO(DESK-517): Reflect changes here.
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (contacts: ModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Remove members from local');
            return this.lifetimeGuard.run((handle) => {
                const numRemoved = this._removeMembers(
                    handle,
                    TriggerSource.LOCAL,
                    contacts,
                    createdAt,
                );
                if (numRemoved > 0) {
                    this._versionSequence.next();
                }
                return numRemoved;
            });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            contacts: ModelStore<Contact>[],
            createdAt: Date,
        ) => {
            this._log.debug('GroupModelController: Remove members from remote');
            return this.lifetimeGuard.run((guardedStoreHandle) => {
                const numRemoved = this._removeMembers(
                    guardedStoreHandle,
                    TriggerSource.REMOTE,
                    contacts,
                    createdAt,
                );
                if (numRemoved === 0) {
                    this._versionSequence.next();
                }
                return numRemoved;
            });
        },
        fromSync: (handle, contacts: ModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Remove members from sync');
            return this.lifetimeGuard.run((guardedStoreHandle) => {
                const numRemoved = this._removeMembers(
                    guardedStoreHandle,
                    TriggerSource.SYNC,
                    contacts,
                    createdAt,
                );
                if (numRemoved > 0) {
                    this._versionSequence.next();
                }
                return numRemoved;
            });
        },
    };

    /** @inheritdoc */
    public readonly setMembers: GroupController['setMembers'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (
            handle,
            updatedGroupMembers: ModelStore<Contact>[],
            reflectedAt: Date,
            newUserState?: GroupUserState.MEMBER,
        ) => {
            this._log.debug('GroupModelController: Set members from sync');
            return this.setMembers.direct(updatedGroupMembers, reflectedAt, newUserState);
        },
        direct: (
            updatedGroupMembers: ModelStore<Contact>[],
            date: Date,
            newUserState?: GroupUserState.MEMBER,
        ) =>
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const {added, removed} = this._diffAndSetMembers(
                    guardedStoreHandle,
                    new Set(updatedGroupMembers),
                    date,
                    newUserState,
                );
                if (added + removed > 0) {
                    this._versionSequence.next();
                }
                return {added, removed};
            }),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            updatedGroupMembers: ModelStore<Contact>[],
            createdAt: Date,
            newUserState?: GroupUserState.MEMBER,
        ) => {
            this._log.debug('GroupModelController: Set members from remote');
            return this.lifetimeGuard.run((guardedStoreHandle) => {
                const {added, removed} = this._diffAndSetMembers(
                    guardedStoreHandle,
                    new Set(updatedGroupMembers),
                    createdAt,
                    newUserState,
                );
                if (added + removed > 0) {
                    this._versionSequence.next();
                }
                return {added, removed};
            });
        },
    };

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
                () =>
                    this.lifetimeGuard.run((handle) => {
                        this._update(handle, validatedChange);
                        this._versionSequence.next();
                    }),
            );
        },
        fromSync: (handle, change: GroupUpdateFromToSync) => {
            this._log.debug('GroupModelController: Update from sync');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._update(guardedStoreHandle, ensureExactGroupUpdateFromToSync(change));
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly name: GroupController['name'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (name, createdAt) => {
            this._log.debug('GroupModelController: Change name from local');
            this.lifetimeGuard.run((handle) => {
                const changed = this._updateName(handle, name, createdAt);
                if (changed) {
                    this._versionSequence.next();
                }
            });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, name, createdAt) => {
            this._log.debug('GroupModelController: Change name from remote');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const changed = this._updateName(guardedStoreHandle, name, createdAt);
                if (changed) {
                    this._versionSequence.next();
                }
            });
        },
        fromSync: (handle, name, createdAt) => {
            this._log.debug('GroupModelController: Change name from sync');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const changed = this._updateName(guardedStoreHandle, name, createdAt);
                if (changed) {
                    this._versionSequence.next();
                }
            });
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
        fromSync: (handle) => {
            this._log.debug('GroupModelController: Remove from sync');
            // TODO(DESK-551): Remove Group
        },
    };

    /** @inheritdoc */
    public readonly kicked: GroupController['kicked'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, createdAt) => {
            this._log.debug('GroupModelController: Kicked from remote');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._update(guardedStoreHandle, {userState: GroupUserState.KICKED});
                this._addUserStateChangedStatusMessage(GroupUserState.KICKED, createdAt);
                this._versionSequence.next();
            });
        },
        fromSync: (handle, createdAt) => {
            this._log.debug('GroupModelController: Kicked from sync');
            this.kicked.direct(createdAt);
        },
        direct: (createdAt) => {
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._update(guardedStoreHandle, {userState: GroupUserState.KICKED});
                this._addUserStateChangedStatusMessage(GroupUserState.KICKED, createdAt);
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly leave: GroupController['leave'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (createdAt) => {
            this._log.debug('GroupModelController: Leave from local');
            // TODO(DESK-551): Properly send CSP message
            this.lifetimeGuard.run((handle) => {
                this._update(handle, {userState: GroupUserState.LEFT});
                this._addUserStateChangedStatusMessage(GroupUserState.LEFT, createdAt);
                this._versionSequence.next();
            });
        },
        fromSync: (handle, createdAt) => {
            this._log.debug('GroupModelController: Leave from sync');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._update(guardedStoreHandle, {userState: GroupUserState.LEFT});
                this._addUserStateChangedStatusMessage(GroupUserState.LEFT, createdAt);
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly dissolve: GroupController['dissolve'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (handle) => {
            this._log.debug('GroupModelController: Dissolve from sync');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._update(guardedStoreHandle, {userState: GroupUserState.LEFT});
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly registerCall: GroupController['registerCall'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromRemote: async (handle, call) => {
            await this._registerCalls([{type: 'init', base: call}], 'new');
        },
        fromSync: (handle, call) => {
            // TODO(DESK-1466): This is wrong. this._registerCall must be awaited or the
            // registration may get lost.
            this._registerCalls([{type: 'init', base: call}], 'new').catch((error: unknown) =>
                this._log.error('Unable to register reflected call', error),
            );
        },
    };

    private readonly _log: Logger;
    private readonly _groupDebugString: string;
    private readonly _lookup: DbReceiverLookup;
    /** A version counter that should be incremented for every group update. */
    private readonly _versionSequence = new SequenceNumberU53<u53>(0);
    /** Async lock for group updates. */
    private readonly _lock = new AsyncLock();
    /** Contains the _chosen_ group call. May only be written to by the `GroupCallManager`. */
    private readonly _call = new WritableStore<ChosenGroupCall | undefined>(undefined);

    /**
     * Instantiate the GroupModelController.
     *
     * IMPORTANT: The caller must ensure that `uid` and `_groupId` arguments both refer to the same
     *            group, otherwise the behavior is undefined.
     */
    public constructor(
        private readonly _services: ServicesForModel,
        public readonly uid: DbGroupUid,
        private readonly _creatorIdentity: IdentityString,
        private readonly _groupId: GroupId,
        initialProfilePictureData: GroupProfilePictureFields,
        private readonly _store: () => GroupModelStore,
    ) {
        this._lookup = {
            type: ReceiverType.GROUP,
            uid: this.uid,
        };

        this._groupDebugString = groupDebugString(this._creatorIdentity, _groupId);
        this._log = _services.logging.logger(`model.group.${uid}`);
        this.notificationTag = getNotificationTagForGroup(this._creatorIdentity, _groupId);
        this.profilePicture = this._services.model.profilePictures.getForGroup(
            this.uid,
            this._creatorIdentity,
            this._groupId,
            initialProfilePictureData,
        );
    }

    /** @inheritdoc */
    public get call(): ReadableStore<ChosenGroupCall | undefined> {
        return this._call;
    }

    /** @inheritdoc */
    public conversation(): ModelStore<Conversation> {
        return this._conversation();
    }

    /** @inheritdoc */
    public hasMember(contact_: ModelStore<Contact> | 'me'): boolean {
        return this.lifetimeGuard.run((handle) => {
            const view = handle.view();
            if (contact_ === 'me') {
                return view.userState === GroupUserState.MEMBER;
            }
            return contact_ === view.creator || view.members.has(contact_);
        });
    }

    /**
     * Register initial calls from the database.
     *
     * Must be called once directly after construction of the {@link GroupModelStore}!
     */
    public initializeCalls(calls: DbList<DbRunningGroupCall>): void {
        this._registerCalls(
            calls.map((call) => deserializeRunningGroupCall(this._services, this._store(), call)),
            'reload',
        ).catch((error: unknown) =>
            this._log.error('Unable to register initial calls loaded from database', error),
        );
    }

    /** @inheritdoc */
    public async refreshCall(token: SfuToken | undefined): Promise<ChosenGroupCall | undefined> {
        return await this._services.model.call.group.refresh(this._store(), token);
    }

    /** @inheritdoc */
    public async joinCall<TIntent = 'join' | 'join-or-create'>(
        intent: TIntent,
        cancel: AbortListener<unknown>,
    ): Promise<TIntent extends 'join' ? OngoingGroupCall | undefined : OngoingGroupCall> {
        // Note: We do not need to use `ModelLifetimeGuard.run(...)` here because whether the group
        // still exists is initially (and continuously for the duration of the group call) checked
        // by `GroupCallmanager.join`.
        const call = await this._services.model.call.group.join(
            {store: this._store(), chosen: this._call},
            intent,
            cancel,
        );

        // When the group call was created by the user, announce it
        if (call?.ctx.type === 'new') {
            assert(intent === 'join-or-create');
            this._services.taskManager
                .schedule(
                    new OutgoingGroupCallStartTask(
                        this._services,
                        this._store(),
                        call.get().controller.base,
                    ),
                )
                .catch(() => {
                    // Ignore (task should persist)
                });
        }
        return call;
    }

    /**
     * Add members to a group and update the view.
     *
     * Return the number of added contacts.
     *
     * Note: Triggers a `group-member-change` status message if a new member was added.
     */
    private _addMembers(
        handle: GuardedStoreHandle<GroupView>,
        contacts: ModelStore<Contact>[],
        createdAt: Date,
    ): u53 {
        if (contacts.length === 0) {
            return 0;
        }

        // Update database and model view
        const oldMembers = handle.view().members;
        const numAdded = addGroupMembers(this._services, this.uid, contacts);
        handle.update(() => {
            const members = getGroupMembers(this._services, this.uid);
            return {members: new Set(members)};
        });

        // Create group change status message
        //
        // If not all members were added for some reason, filter them out
        let added = contacts;
        if (numAdded !== contacts.length) {
            const newMembers = handle.view().members;
            added = contacts.filter((c) => !oldMembers.has(c) && newMembers.has(c));
        }
        this._addGroupMemberChangeStatusMessage(added, [], createdAt);

        return numAdded;
    }

    private _setMembers(
        handle: GuardedStoreHandle<GroupView>,
        added: ModelStore<Contact>[],
        removed: ModelStore<Contact>[],
    ): void {
        // Update database and model view
        handle.update(() => {
            removeGroupMembers(this._services, this.uid, removed);
            addGroupMembers(this._services, this.uid, added);
            const members = getGroupMembers(this._services, this.uid);
            return {members: new Set(members)};
        });
    }

    /**
     * Calculates the diff of the given member list and the current member list and updates the
     * group with the added and removed members.
     *
     * Adds the user to the group if `newUserState` is not undefined.
     *
     * Returns the number of added and removed members.
     *
     * Note: Triggers a `group-member-change` status message if a new member was added.
     */
    private _diffAndSetMembers(
        guardedGroupViewStoreHandle: GuardedStoreHandle<GroupView>,
        updatedGroupMembers: Set<ModelStore<Contact>>,
        date: Date,
        newUserState?: GroupUserState.MEMBER,
    ): {added: u53; removed: u53} {
        let addedCount = 0;

        // If the user is not part of the group, make them a member.
        if (
            newUserState !== undefined &&
            newUserState !== guardedGroupViewStoreHandle.view().userState
        ) {
            this._update(guardedGroupViewStoreHandle, {userState: newUserState});
            addedCount += 1;
        }

        // Because the user addition happens atomically with the addition of other members, they
        // share the same timestamp which determines the place where the frontend places the
        // messages. To avoid indeterministic behaviour, we always make the group member change
        // status message appear first by putting the timestamp one millisecond into the past.
        if (addedCount === 1) {
            this._addUserStateChangedStatusMessage(
                GroupUserState.MEMBER,
                new Date(date.getTime() - 1),
            );
        }

        const currentGroupCreator = guardedGroupViewStoreHandle.view().creator;
        const currentGroupMembers = guardedGroupViewStoreHandle.view().members;
        const currentMemberIdentities = new Set(
            [...currentGroupMembers].map((member) => member.get().view.identity),
        );
        const updatedMemberIdentities = new Set(
            [...updatedGroupMembers].map((member) => member.get().view.identity),
        );
        this._log.debug(
            `Current group member list: ${[...currentMemberIdentities].sort((a, b) => a.localeCompare(b)).join(', ')}`,
        );
        this._log.debug(
            `Updated group member list: ${[...updatedMemberIdentities].sort((a, b) => a.localeCompare(b)).join(', ')}`,
        );

        // eslint-disable-next-line func-style
        const isNotUndefinedOrCreator = (
            member: ModelStore<Contact> | undefined,
        ): member is ModelStore<Contact> => {
            if (member === undefined) {
                return false;
            }
            // The user's own identity can never be a `member`, so if `member` is defined but the
            // group creator is `"me"`, we know for sure that `member` is not the creator, so we can
            // always include them.
            if (currentGroupCreator === 'me') {
                return true;
            }

            // Keep all `member`s that are not the creator.
            return member.get().view.identity !== currentGroupCreator.get().view.identity;
        };

        const membersToAdd = [...difference(updatedMemberIdentities, currentMemberIdentities)]
            .map((identity) => this._services.model.contacts.getByIdentity(identity))
            .filter(isNotUndefinedOrCreator);
        const membersToRemove = [...difference(currentMemberIdentities, updatedMemberIdentities)]
            .map((identity) => this._services.model.contacts.getByIdentity(identity))
            .filter(isNotUndefinedOrCreator);

        this._log.debug(
            `Members to add: ${membersToAdd.map((member) => member.get().view.identity).join(', ')}`,
        );
        this._log.debug(
            `Members to remove: ${membersToRemove.map((member) => member.get().view.identity).join(', ')}`,
        );

        if (membersToAdd.length === 0 && membersToRemove.length === 0) {
            return {added: addedCount, removed: 0};
        }
        this._setMembers(guardedGroupViewStoreHandle, membersToAdd, membersToRemove);
        this._addGroupMemberChangeStatusMessage(membersToAdd, membersToRemove, date);

        return {added: membersToAdd.length + addedCount, removed: membersToRemove.length};
    }

    /**
     * Remove members from a group and update the view.
     *
     * Returns the number of removed contacts.
     *
     * Note: Triggers a `group-member-change` status message if a new member was removed.
     */
    private _removeMembers(
        handle: GuardedStoreHandle<GroupView>,
        triggerSource: TriggerSource,
        contacts: ModelStore<Contact>[],
        createdAt: Date,
    ): u53 {
        if (contacts.length === 0) {
            return 0;
        }

        // Update database and model view
        const oldMembers = handle.view().members;
        const numRemoved = removeGroupMembers(this._services, this.uid, contacts);
        handle.update(() => {
            const members = getGroupMembers(this._services, this.uid);
            return {members: new Set(members)};
        });

        // Create group change status message
        //
        // If not all members were removed for some reason, filter them out
        let removed = contacts;
        if (numRemoved !== contacts.length) {
            const newMembers = handle.view().members;
            removed = contacts.filter((c) => oldMembers.has(c) && !newMembers.has(c));
        }
        this._addGroupMemberChangeStatusMessage([], removed, createdAt);

        switch (triggerSource) {
            case TriggerSource.LOCAL:
                // TODO(DESK-1331: Add reflection task)
                break;
            case TriggerSource.REMOTE:
            case TriggerSource.SYNC:
            case TriggerSource.DIRECT:
                break;
            default:
                unreachable(triggerSource);
        }

        return numRemoved;
    }

    /**
     * Locally update the group.
     */
    private _update(handle: GuardedStoreHandle<GroupView>, change: GroupUpdate): void {
        handle.update(() => {
            update(this._services, this.uid, ensureExactGroupUpdate(change));
            const derivedChange: Mutable<Partial<GroupView>, 'displayName'> = {...change};

            const members = getGroupMembers(this._services, this.uid);

            const creator = handle.view().creator;

            // Update display name, if necessary
            if (derivedChange.name !== undefined) {
                derivedChange.displayName = getDisplayName(
                    derivedChange.name,
                    handle.view().userState,
                    creator,
                    members,
                    this._services,
                );
            }

            return derivedChange;
        });
    }

    /**
     * Update the group name and create the corresponding status message.
     */
    private _updateName(
        handle: GuardedStoreHandle<GroupView>,
        name: string,
        createdAt: Date,
    ): boolean {
        const oldName = handle.view().name === '' ? '' : handle.view().displayName;
        this._update(handle, {name});
        if (oldName !== name) {
            this.conversation()
                .get()
                .controller.createStatusMessage({
                    type: StatusMessageType.GROUP_NAME_CHANGED,
                    value: {
                        oldName,
                        newName: name,
                    },
                    createdAt,
                });
        }
        return oldName !== name;
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
                creatorIdentity: this._creatorIdentity,
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
        this.lifetimeGuard.deactivate(() => {
            // Deactivate and purge the conversation and all of its messages
            // from their respective caches
            conversation.deactivateAndPurgeCacheCascade(this._lookup, this.conversation());

            // Now, remove the group. This implicitly removes the
            // conversation and all of its messages in the database.
            remove(this._services, this.uid);
        });
    }

    private _conversation(): ConversationModelStore {
        return this.lifetimeGuard.run(() =>
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

    private _addGroupMemberChangeStatusMessage(
        added: ModelStore<Contact>[],
        removed: ModelStore<Contact>[],
        createdAt: Date,
    ): void {
        const groupConversation = this.conversation().get();

        if (added.length === 0 && removed.length === 0) {
            this._log.warn(
                'Trying to create a group member change status message without group member changes',
            );
            return;
        }

        groupConversation.controller.createStatusMessage({
            type: StatusMessageType.GROUP_MEMBER_CHANGED,
            value: {
                added: added.map((contactModelStore) => contactModelStore.get().view.identity),
                removed: removed.map((contactModelStore) => contactModelStore.get().view.identity),
            },
            createdAt,
        });
    }

    private _addUserStateChangedStatusMessage(newUserState: GroupUserState, createdAt: Date): void {
        this.conversation().get().controller.createStatusMessage({
            type: StatusMessageType.GROUP_USER_STATE_CHANGED,
            value: {
                newUserState,
            },
            createdAt,
        });
    }

    /**
     * Register a call on the `GroupCallManager`
     *
     * Note: This automatically creates status messages.
     */
    private async _registerCalls(
        calls: readonly RunningGroupCall<'init' | 'failed'>[],
        type: 'new' | 'reload',
    ): Promise<void> {
        if (calls.length === 0) {
            return;
        }

        // Register the call first
        const registered = await this._services.model.call.group.register(
            {store: this._store(), chosen: this._call},
            calls,
            type,
        );

        // Notify the user if one of the **newly added** group calls has been determined as
        // _chosen_.
        //
        // Note: Waiting for _chosen_ ensures that the user does not get notified when it is no
        // longer running.
        if (type === 'reload') {
            return;
        }
        registered.chosen
            .then((chosen) => {
                if (
                    chosen === undefined ||
                    this._services.model.user.callsSettings.get().view.groupCallPolicy !==
                        GroupCallPolicy.ALLOW_GROUP_CALL
                ) {
                    return;
                }
                for (const call of calls) {
                    if (
                        !byteEquals(
                            chosen.base.derivations.callId.bytes,
                            call.base.derivations.callId.bytes,
                        )
                    ) {
                        continue;
                    }
                    // TODO(DESK-1505): Implement proper call start notifications with ringtones.
                    this._services.notification
                        .notifyGroupCallStart(chosen, this._store().get())
                        .catch((error: unknown) => {
                            this._log.error(`Group call start notification failed: ${error}`);
                        });
                }
            })
            .catch(assertUnreachable);
    }
}

/** @inheritdoc */
export class GroupModelStore extends ModelStore<Group> {
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
        runningCalls: DbList<DbRunningGroupCall>,
        initialProfilePictureData: GroupProfilePictureFields,
    ) {
        const {logging} = services;
        const tag = `group.${uid}`;
        const controller = new GroupModelController(
            services,
            uid,
            contact.getIdentityString(services.device, group.creator),
            group.groupId,
            initialProfilePictureData,
            () => this,
        );
        super(group, controller, uid, ReceiverType.GROUP, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });

        // Note: We need to do this delayed here as initializing calls requires access to the
        // `GroupModelStore` instance which is not fully constructed during the `super(...)` call.
        controller.initializeCalls(runningCalls);
    }
}

/** @inheritdoc */
export class GroupModelRepository implements GroupRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public readonly add: GroupRepository['add'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (init: GroupInit, members: ModelStore<Contact>[]) => {
            this._log.debug('Add group from local');
            return create(this._services, ensureExactGroupInit(init), members);
        },

        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, init: GroupInit, members: ModelStore<Contact>[]) => {
            this._log.debug('Add group from remote');
            return create(this._services, ensureExactGroupInit(init), members);
        },

        fromSync: (handle, init: GroupInit, members: ModelStore<Contact>[]) => {
            this._log.debug('Add group from sync');
            return this.add.direct(init, members);
        },
        direct: (init: GroupInit, members: ModelStore<Contact>[]) =>
            create(this._services, ensureExactGroupInit(init), members),
    };

    private readonly _log: Logger;

    public constructor(private readonly _services: ServicesForModel) {
        this._log = _services.logging.logger('model.group-repository');

        // TODO(DESK-697): This is a quick workaround to make some tests work,
        // but should be probably a private class attribute (not a trivial change as of now), or maybe be
        // moved down to DB level. This case was the origin of DESK-697.
        this._log.debug('Creating new cache');
        cache = new ModelStoreCache<DbGroupUid, ModelStore<Group>>();
    }

    /** @inheritdoc */
    public getByUid(uid: DbGroupUid): ModelStore<Group> | undefined {
        return getByUid(this._services, uid, Existence.UNKNOWN);
    }

    /** @inheritdoc */
    public getByGroupIdAndCreator(
        id: GroupId,
        creatorIdentity: IdentityString,
    ): ModelStore<Group> | undefined {
        return getByGroupIdAndCreator(this._services, id, creatorIdentity);
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<ModelStore<Group>> {
        return all(this._services);
    }

    public getProfilePicture(uid: DbGroupUid): ModelStore<ProfilePicture> | undefined {
        return this.getByUid(uid)?.get().controller.profilePicture;
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
