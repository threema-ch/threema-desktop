import type {
    DbContactUid,
    DbCreate,
    DbCreateConversationMixin,
    DbGroup,
    DbGroupUid,
    DbReceiverLookup,
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
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {ChosenGroupCall, GroupCallBaseData} from '~/common/network/protocol/call/group-call';
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
import type {AbortListener} from '~/common/utils/signal';
import {WritableStore, type ReadableStore} from '~/common/utils/store';
import {LocalSetStore} from '~/common/utils/store/set-store';
import {getGraphemeClusters} from '~/common/utils/string';

let cache = new LocalModelStoreCache<DbGroupUid, LocalModelStore<Group>>();

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
    creator: LocalModelStore<Contact> | 'me',
    groupMembers: Set<LocalModelStore<Contact>>,
    services: Pick<ServicesForModel, 'model'>,
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
    if (userState === GroupUserState.MEMBER) {
        memberNames.push(services.model.user.displayName.get());
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
    contactToAdd: LocalModelStore<Contact>,
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
    contactsToAdd: LocalModelStore<Contact>[],
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
): Set<LocalModelStore<Contact>> {
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
    contactToRemove: LocalModelStore<Contact>,
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
    contactsToRemove: LocalModelStore<Contact>[],
): u53 {
    return contactsToRemove.reduce(
        (count, contactToRemove) => count + removeGroupMember(services, groupUid, contactToRemove),
        0,
    );
}

function create(
    services: ServicesForModel,
    init: Exact<GroupInit>,
    members: LocalModelStore<Contact>[],
): LocalModelStore<Group> {
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

        // Create a store
        return new GroupModelStore(services, view, uid, profilePictureData);
    });
}

function getByGroupIdAndCreator(
    services: ServicesForModel,
    id: GroupId,
    creatorIdentity: IdentityString,
): LocalModelStore<Group> | undefined {
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

function all(services: ServicesForModel): LocalSetStore<LocalModelStore<Group>> {
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
    public readonly meta = new ModelLifetimeGuard<GroupView>();
    public readonly notificationTag: NotificationTag;

    /** @inheritdoc */
    public readonly profilePicture: LocalModelStore<ProfilePicture>;

    public readonly addMembers: GroupController['addMembers'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // TODO(DESK-165): Reflect changes here.
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async (contacts: LocalModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Add members from local');
            return this.meta.run((handle) => {
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
        fromLocal: async (contacts: LocalModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Remove members from local');
            return this.meta.run((handle) => {
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
            contacts: LocalModelStore<Contact>[],
            createdAt: Date,
        ) => {
            this._log.debug('GroupModelController: Remove members from remote');
            return this.meta.run((guardedHandle) => {
                const numRemoved = this._removeMembers(
                    guardedHandle,
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
        fromSync: (contacts: LocalModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Remove members from sync');
            return this.meta.run((handle) => {
                const numRemoved = this._removeMembers(
                    handle,
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
            contacts: LocalModelStore<Contact>[],
            createdAt: Date,
            newUserState?: GroupUserState.MEMBER,
        ) => {
            this._log.debug('GroupModelController: Set members from sync');
            return this.meta.run((handle) => {
                const {added, removed} = this._diffAndSetMembers(
                    handle,
                    contacts,
                    createdAt,
                    newUserState,
                );
                if (added + removed > 0) {
                    this._versionSequence.next();
                }
                return {added, removed};
            });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            contacts: LocalModelStore<Contact>[],
            createdAt: Date,
            newUserState?: GroupUserState.MEMBER,
        ) => {
            this._log.debug('GroupModelController: Set members from remote');
            return this.meta.run((guardedHandle) => {
                const {added, removed} = this._diffAndSetMembers(
                    guardedHandle,
                    contacts,
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
                    this.meta.run((handle) => {
                        this._update(handle, validatedChange);
                        this._versionSequence.next();
                    }),
            );
        },
        fromSync: (change: GroupUpdateFromToSync) => {
            this._log.debug('GroupModelController: Update from sync');
            this.meta.run((handle) => {
                this._update(handle, ensureExactGroupUpdateFromToSync(change));
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
            this.meta.run((handle) => {
                const changed = this._updateName(handle, name, createdAt);
                if (changed) {
                    this._versionSequence.next();
                }
            });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, name, createdAt) => {
            this._log.debug('GroupModelController: Change name from remote');
            this.meta.run((guardedHandle) => {
                const changed = this._updateName(guardedHandle, name, createdAt);
                if (changed) {
                    this._versionSequence.next();
                }
            });
        },
        fromSync: (name, createdAt) => {
            this._log.debug('GroupModelController: Change name from sync');
            this.meta.run((handle) => {
                const changed = this._updateName(handle, name, createdAt);
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
        fromSync: () => {
            this._log.debug('GroupModelController: Remove from sync');
            // TODO(DESK-551): Remove Group
        },
    };

    /** @inheritdoc */
    public readonly kicked: GroupController['kicked'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle) => {
            this._log.debug('GroupModelController: Kicked from remote');
            this.meta.run((guardedHandle) => {
                this._update(guardedHandle, {userState: GroupUserState.KICKED});
                this._versionSequence.next();
            });
        },
        fromSync: () => {
            this._log.debug('GroupModelController: Kicked from sync');
            this.meta.run((handle) => {
                this._update(handle, {userState: GroupUserState.KICKED});
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly leave: GroupController['leave'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        // eslint-disable-next-line @typescript-eslint/require-await
        fromLocal: async () => {
            this._log.debug('GroupModelController: Leave from local');
            // TODO(DESK-551): Properly send CSP message
            this.meta.run((handle) => {
                this._update(handle, {userState: GroupUserState.LEFT});
                this._versionSequence.next();
            });
        },
        fromSync: () => {
            this._log.debug('GroupModelController: Leave from sync');
            this.meta.run((handle) => {
                this._update(handle, {userState: GroupUserState.LEFT});
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly dissolve: GroupController['dissolve'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: () => {
            this._log.debug('GroupModelController: Dissolve from sync');
            this.meta.run((handle) => {
                this._update(handle, {userState: GroupUserState.LEFT});
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly registerCall: GroupController['registerCall'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromRemote: async (handle, call) => {
            await this._registerCall(call);
        },
        fromSync: (call) => {
            // TODO(DESK-1466): This is wrong. this._registerCall must be awaited or the
            // registration may get lost.
            this._registerCall(call).catch((error: unknown) =>
                this._log.error('Unable to register call', error),
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
    public conversation(): LocalModelStore<Conversation> {
        return this._conversation();
    }

    /** @inheritdoc */
    public hasMember(contact_: LocalModelStore<Contact> | 'me'): boolean {
        return this.meta.run((handle) => {
            const view = handle.view();
            if (contact_ === 'me') {
                return view.userState === GroupUserState.MEMBER;
            }
            return contact_ === view.creator || view.members.has(contact_);
        });
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
        contacts: LocalModelStore<Contact>[],
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

    /**
     * Diff the provided {@link contacts} against the group member list.
     *
     * Return which contacts would be removed or added as members when setting them all as the new
     * member list.
     */
    private _diffMembers(
        guardedHandle: GuardedStoreHandle<GroupView>,
        contacts: Set<LocalModelStore<Contact>>,
    ): {
        added: LocalModelStore<Contact>[];
        removed: LocalModelStore<Contact>[];
    } {
        const currentMembers = guardedHandle.view().members;
        const creator = guardedHandle.view().creator;
        const added = new Set<LocalModelStore<Contact>>();
        const removed = new Set<LocalModelStore<Contact>>();
        for (const c of contacts) {
            // If the contact's reference is the creator, do nothing.
            if (c === creator) {
                this._log.warn('Cannot add a member which is the creator, ignoring it.');
                continue;
            }
            if (!currentMembers.has(c)) {
                added.add(c);
            }
        }

        for (const m of currentMembers) {
            if (m === creator) {
                this._log.warn('Current group member list ignores creator, ignoring it.');
                continue;
            }
            if (!contacts.has(m)) {
                removed.add(m);
            }
        }

        return {added: [...added], removed: [...removed]};
    }

    private _setMembers(
        handle: GuardedStoreHandle<GroupView>,
        added: LocalModelStore<Contact>[],
        removed: LocalModelStore<Contact>[],
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
        guardedHandle: GuardedStoreHandle<GroupView>,
        contacts: LocalModelStore<Contact>[],
        createdAt: Date,
        newUserState?: GroupUserState.MEMBER,
    ): {added: u53; removed: u53} {
        let userAdded = 0;
        if (newUserState !== undefined && newUserState !== guardedHandle.view().userState) {
            this._update(guardedHandle, {userState: newUserState});
            userAdded += 1;
        }
        const {added, removed} = this._diffMembers(guardedHandle, new Set(contacts));
        if (added.length === 0 && removed.length === 0) {
            return {added: userAdded, removed: 0};
        }
        this._setMembers(guardedHandle, [...added], [...removed]);
        this._addGroupMemberChangeStatusMessage(added, removed, createdAt);
        return {added: added.length + userAdded, removed: removed.length};
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
        contacts: LocalModelStore<Contact>[],
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

    private _addGroupMemberChangeStatusMessage(
        added: LocalModelStore<Contact>[],
        removed: LocalModelStore<Contact>[],
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
                added: added.map((c) => c.get().view.identity),
                removed: removed.map((c) => c.get().view.identity),
            },
            createdAt,
        });
    }

    /**
     * Register a call on the `GroupCallManager`
     *
     * Note: This automatically creates status messages.
     */
    private async _registerCall(call: GroupCallBaseData): Promise<void> {
        // Register the call first
        const registered = await this._services.model.call.group.register(
            {store: this._store(), chosen: this._call},
            [{type: 'init', base: call}],
            'new',
        );

        // Notify the user if the group call has been determined as _chosen_.
        //
        // Note: Waiting for _chosen_ ensures that the user does not get notified when it is no
        // longer running.
        registered.chosen
            .then((chosen) => {
                if (
                    chosen !== undefined &&
                    byteEquals(chosen.base.derivations.callId.bytes, call.derivations.callId.bytes)
                ) {
                    if (
                        this._services.model.user.callsSettings.get().view.groupCallPolicy ===
                        GroupCallPolicy.ALLOW_GROUP_CALL
                    ) {
                        // TODO(DESK-1505): Implement proper call start notifications with ringtones.
                        this._services.notification
                            .notifyGroupCallStart(chosen, this._store().get())
                            .catch((error: unknown) => {
                                this._log.error(`Group call start notification failed: ${error}`);
                            });
                    }
                }
            })
            .catch(assertUnreachable);
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
        initialProfilePictureData: GroupProfilePictureFields,
    ) {
        const {logging} = services;
        const tag = `group.${uid}`;
        super(
            group,
            new GroupModelController(
                services,
                uid,
                contact.getIdentityString(services.device, group.creator),
                group.groupId,
                initialProfilePictureData,
                () => this,
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
        fromLocal: async (init: GroupInit, members: LocalModelStore<Contact>[]) => {
            this._log.debug('Add group from local');
            return create(this._services, ensureExactGroupInit(init), members);
        },

        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, init: GroupInit, members: LocalModelStore<Contact>[]) => {
            this._log.debug('Add group from remote');
            return create(this._services, ensureExactGroupInit(init), members);
        },

        fromSync: (init: GroupInit, members: LocalModelStore<Contact>[]) => {
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
        creatorIdentity: IdentityString,
    ): LocalModelStore<Group> | undefined {
        return getByGroupIdAndCreator(this._services, id, creatorIdentity);
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<LocalModelStore<Group>> {
        return all(this._services);
    }

    public getProfilePicture(uid: DbGroupUid): LocalModelStore<ProfilePicture> | undefined {
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
