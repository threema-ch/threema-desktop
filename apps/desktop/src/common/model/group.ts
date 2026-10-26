import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';
import type {u53} from '@threema/ts-utils/integer/u53';
import {AsyncLock} from '@threema/ts-utils/lock/async-lock';
import {SequenceNumberU53} from '@threema/ts-utils/sequence-number/sequence-number-u53';
import {getGraphemeClusters} from '@threema/ts-utils/string/get-grapheme-clusters';

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
    ConversationCategory,
    ConversationVisibility,
    Existence,
    GroupCallPolicy,
    GroupMemberState,
    GroupUserState,
    ReceiverType,
    StatusMessageType,
} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import {ProfilePictureChange} from '~/common/internal-protobuf/status-message';
import type {Logger} from '~/common/logging';
import * as contact from '~/common/model/contact';
import {getIdentityString} from '~/common/model/contact';
import type {ConversationModelStore} from '~/common/model/conversation';
import * as conversation from '~/common/model/conversation';
import type {OngoingGroupCall} from '~/common/model/group-call';
import type {GroupProfilePictureFields} from '~/common/model/profile-picture';
import type {GuardedStoreHandle, ServicesForModel} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {Conversation} from '~/common/model/types/conversation';
import type {
    Group,
    GroupController,
    GroupInit,
    GroupRepository,
    GroupUpdate,
    GroupCreateOrUpdateFromLocal,
    GroupView,
} from '~/common/model/types/group';
import type {ProfilePicture} from '~/common/model/types/profile-picture';
import {ModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {encryptAndUploadBlob} from '~/common/network/protocol/blob';
import {
    deserializeRunningGroupCall,
    type ChosenGroupCall,
    type RunningGroupCall,
} from '~/common/network/protocol/call/group-call';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import type {SfuToken} from '~/common/network/protocol/directory';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {OutgoingGroupCallStartTask} from '~/common/network/protocol/task/csp/outgoing-group-call-start';
import {OutgoingGroupCreateOrUpdateTask} from '~/common/network/protocol/task/csp/outgoing-group-create-or-update';
import {OutgoingGroupDisbandTask} from '~/common/network/protocol/task/csp/outgoing-group-disband';
import {OutgoingGroupLeaveTask} from '~/common/network/protocol/task/csp/outgoing-group-leave';
import type {
    D2dRemoveProfilePicture,
    D2dSetProfilePicture,
} from '~/common/network/protocol/task/d2d';
import {ReflectGroupSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-group-sync-transaction';
import {randomGroupId} from '~/common/network/protocol/utils';
import type {GroupId, IdentityString} from '~/common/network/types';
import {getNotificationTagForGroup, type NotificationTag} from '~/common/notification';
import type {Mutable} from '~/common/types';
import {assert, assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {idColorIndex, idColorIndexToString} from '~/common/utils/id-color';
import {omit} from '~/common/utils/object';
import {
    createExactPropertyValidator,
    type Exact,
    OPTIONAL,
    REQUIRED,
} from '~/common/utils/property-validator';
import {difference} from '~/common/utils/set';
import type {AbortListener} from '~/common/utils/signal';
import {WritableStore, type ReadableStore} from '~/common/utils/store';
import {LocalSetStore} from '~/common/utils/store/set-store';

let cache = new ModelStoreCache<DbGroupUid, ModelStore<Group>>();

const ensureExactGroupInit = createExactPropertyValidator<GroupInit>('GroupInit', {
    groupId: REQUIRED,
    creator: REQUIRED,
    createdAt: REQUIRED,
    name: REQUIRED,
    colorIndex: REQUIRED,
    userState: REQUIRED,
    notificationTriggerPolicyOverride: OPTIONAL,
    lastUpdate: OPTIONAL,
    category: REQUIRED,
    visibility: REQUIRED,
});

const ensureExactGroupUpdate = createExactPropertyValidator<GroupUpdate>('GroupUpdate', {
    name: OPTIONAL,
    userState: OPTIONAL,
    notificationTriggerPolicyOverride: OPTIONAL,
});

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
    contactsToAdd: readonly ModelStore<Contact>[],
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
    contactsToRemove: readonly ModelStore<Contact>[],
): u53 {
    return contactsToRemove.reduce(
        (count, contactToRemove) => count + removeGroupMember(services, groupUid, contactToRemove),
        0,
    );
}

function create(
    services: ServicesForModel,
    init: Exact<GroupInit>,
    members: readonly ModelStore<Contact>[],
    profilePictureBytes: ReadonlyUint8Array | undefined,
    log: Logger,
): ModelStore<Group> {
    const {db} = services;

    let creatorUid: DbContactUid | undefined = undefined;
    if (init.creator !== 'me') {
        // Ensure that the creator exists in the database already.
        creatorUid = db.hasContactByIdentity(init.creator.get().view.identity);
        assert(creatorUid !== undefined, 'Creator UID not found when adding group');
    }

    let uid = db.hasGroupByIdAndCreatorUid(init.groupId, creatorUid);
    let group: DbCreate<DbGroup> & DbCreateConversationMixin;
    if (uid === undefined) {
        group = {
            ...omit(init, ['creator']),
            type: ReceiverType.GROUP,
            creatorUid,
            profilePictureAdminDefined: profilePictureBytes,
        };
        uid = db.createGroup(group);
        // Add members
        addGroupMembers(services, uid, members);
    } else {
        // In the rare (if not impossible) case that the group already exists, we return the group that
        // already exists.
        log.warn('Trying to create a group that already exists. Falling back to existing group.');
        const existingGroup = db.getGroupByUid(uid);
        assert(existingGroup !== undefined);
        const existingGroupConversationUid = db.getGroupConversationUidByCreatorIdentity(
            init.creator === 'me' ? undefined : init.creator.get().view.identity,
            init.groupId,
        );
        assert(existingGroupConversationUid !== undefined);
        const existingGroupConversation = db.getConversationByUid(existingGroupConversationUid);
        assert(existingGroupConversation !== undefined);
        group = {
            ...existingGroup,
            category: existingGroupConversation.category,
            visibility: existingGroupConversation.visibility,
        };
    }

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
    const groupStore = cache.getOrAdd(
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

    /** @inheritdoc */
    public readonly removeMembers: GroupController['removeMembers'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            contacts: ModelStore<Contact>[],
            createdAt: Date,
        ) => {
            this._log.debug('GroupModelController: Remove members from remote');
            return this.lifetimeGuard.run((guardedStoreHandle) => {
                const numRemoved = this._removeMembers(guardedStoreHandle, contacts, createdAt);
                if (numRemoved > 0) {
                    this._versionSequence.next();
                }
                return numRemoved;
            });
        },
        fromSync: (handle, contacts: ModelStore<Contact>[], createdAt: Date) => {
            this._log.debug('GroupModelController: Remove members from sync');
            return this.removeMembers.direct(contacts, createdAt);
        },
        direct: (contacts: ModelStore<Contact>[], createdAt: Date) =>
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const numRemoved = this._removeMembers(guardedStoreHandle, contacts, createdAt);
                if (numRemoved > 0) {
                    this._versionSequence.next();
                }
                return numRemoved;
            }),
    };

    /** @inheritdoc */
    public readonly setMembers: GroupController['setMembers'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (updatedGroupMembers: readonly ModelStore<Contact>[], createdAt: Date) => {
            if (
                this._creatorIdentity !== this._services.device.identity.string ||
                this.lifetimeGuard.run(
                    (handle) => handle.view().userState !== GroupUserState.MEMBER,
                )
            ) {
                this._log.error('Group members can only be edited by the creator');
                return 'failed';
            }

            const memberSet = new Set(updatedGroupMembers);
            const reflectResult = await this._reflectAndCommitGroupUpdate({}, memberSet);

            if (reflectResult === 'failed') {
                return 'failed';
            }

            // Update displayName bc. of groups without a name
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._refreshDefaultDisplayName(guardedStoreHandle);
            });

            const {addedMembers, removedMembers} = reflectResult;
            if (addedMembers.length > 0 || removedMembers.length > 0) {
                this._versionSequence.next();
                this._addGroupMemberChangeStatusMessage(addedMembers, removedMembers, createdAt);
                await this._scheduleOutgoingGroupTask(
                    {},
                    {
                        currentMembers: memberSet,
                        addedMembers: new Set(addedMembers),
                        removedMembers: new Set(removedMembers),
                    },
                );
            }
            return {added: addedMembers.length, removed: removedMembers.length};
        },
        fromSync: (
            handle,
            updatedGroupMembers: readonly ModelStore<Contact>[],
            reflectedAt: Date,
            newUserState?: GroupUserState.MEMBER,
            memberStateHints?: ReadonlyMap<IdentityString, GroupMemberState>,
        ) => {
            this._log.debug('GroupModelController: Set members from sync');
            return this.setMembers.direct(
                updatedGroupMembers,
                reflectedAt,
                newUserState,
                memberStateHints,
            );
        },
        direct: (
            updatedGroupMembers: readonly ModelStore<Contact>[],
            date: Date,
            newUserState?: GroupUserState.MEMBER,
            memberStateHints?: ReadonlyMap<IdentityString, GroupMemberState>,
        ) =>
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const {added, removed} = this._diffAndSetMembers(
                    guardedStoreHandle,
                    new Set(updatedGroupMembers),
                    date,
                    newUserState,
                    memberStateHints,
                );
                // Update displayName bc. of groups without a name
                this._refreshDefaultDisplayName(guardedStoreHandle);
                if (added + removed > 0) {
                    this._versionSequence.next();
                }
                return {added, removed};
            }),
        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (
            handle: ActiveTaskCodecHandle<'volatile'>,
            updatedGroupMembers: readonly ModelStore<Contact>[],
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
                // Update displayName bc. of groups without a name
                this._refreshDefaultDisplayName(guardedStoreHandle);
                return {added, removed};
            });
        },
    };

    /** @inheritdoc */
    public readonly update: GroupController['update'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (handle, change: GroupUpdate, createdAt: Date) => {
            this._log.debug('GroupModelController: Update from sync');
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const currentView = {...guardedStoreHandle.view()};
                this._update(guardedStoreHandle, change);
                this._versionSequence.next();

                // Create a status message if the name has changed.
                if (change.name !== undefined) {
                    this._createGroupNameStatusMessage(currentView.name, change.name, createdAt);
                }

                // Create a status message if the user state has changed.
                if (change.userState !== undefined && change.userState !== currentView.userState) {
                    this._addUserStateChangedStatusMessage(change.userState, createdAt);
                }
            });
        },
    };

    /** @inheritdoc */
    public readonly setProfilePicture: GroupController['setProfilePicture'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (profilePictureBytes) => {
            if (
                this._creatorIdentity !== this._services.device.identity.string ||
                this.lifetimeGuard.run(
                    (handle) => handle.view().userState !== GroupUserState.MEMBER,
                )
            ) {
                this._log.error('Groups can only be edited by the creator');
                return false;
            }

            const currentProfilePicture = this.profilePicture.get().view.picture;

            if (
                currentProfilePicture !== undefined &&
                byteEquals(currentProfilePicture, profilePictureBytes)
            ) {
                this._log.debug('Profile picture does not contain any changes');
                return false;
            }

            const blobInfo = await encryptAndUploadBlob(
                this._services,
                profilePictureBytes,
                BLOB_FILE_NONCE,
                'public-persistent',
            );

            const reflect = await this._reflectAndCommitGroupUpdate({}, undefined, {
                type: 'set',
                blob: {
                    blobId: blobInfo.id,
                    key: blobInfo.key,
                    nonce: blobInfo.nonce,
                    uploadedAt: new Date(),
                },
                profilePictureBytes,
            });

            if (reflect === 'failed') {
                this._log.debug('Failed to set group profile picture');
                return false;
            }

            this._versionSequence.next();

            await this._scheduleOutgoingGroupTask(
                {
                    profilePictureChange: {
                        type: 'set',
                        blob: {
                            blobId: blobInfo.id,
                            key: blobInfo.key,
                            nonce: blobInfo.nonce,
                            uploadedAt: new Date(),
                        },
                        pictureBytes: profilePictureBytes,
                    },
                },
                {
                    currentMembers: this.lifetimeGuard.run((handle) => handle.view().members),
                    addedMembers: new Set(),
                    removedMembers: new Set(),
                },
            );

            this._createProfilePictureChangeStatusMessage(ProfilePictureChange.SET, new Date());

            return true;
        },
    };

    /** @inheritdoc */
    public readonly removeProfilePicture: GroupController['removeProfilePicture'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async () => {
            if (
                this._creatorIdentity !== this._services.device.identity.string ||
                this.lifetimeGuard.run(
                    (handle) => handle.view().userState !== GroupUserState.MEMBER,
                )
            ) {
                this._log.error('Groups can only be edited by the creator');
                return false;
            }

            const currentProfilePicture = this.profilePicture.get().view.picture;

            if (currentProfilePicture === undefined) {
                this._log.debug('Cannot remove a profile picture that is not set');
                return false;
            }

            const reflect = await this._reflectAndCommitGroupUpdate({}, undefined, {
                type: 'removed',
            });

            if (reflect === 'failed') {
                this._log.debug('Failed to remove group profile picture');
                return false;
            }

            this._versionSequence.next();

            await this._scheduleOutgoingGroupTask(
                {profilePictureChange: {type: 'removed'}},
                {
                    currentMembers: this.lifetimeGuard.run((handle) => handle.view().members),
                    addedMembers: new Set(),
                    removedMembers: new Set(),
                },
            );

            this._createProfilePictureChangeStatusMessage(ProfilePictureChange.REMOVED, new Date());

            return true;
        },
    };

    /** @inheritdoc */
    public readonly name: GroupController['name'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (name, createdAt) => {
            if (
                this._creatorIdentity !== this._services.device.identity.string ||
                this.lifetimeGuard.run(
                    (handle) => handle.view().userState !== GroupUserState.MEMBER,
                )
            ) {
                this._log.error('Groups can only be edited by the creator');
                return false;
            }

            this._log.debug('GroupModelController: Change name from local');
            const oldName = this.lifetimeGuard.run((handle) => handle.view().name);
            const reflectResult = await this._reflectAndCommitGroupUpdate({name});

            if (reflectResult === 'failed') {
                return false;
            }

            const changed = oldName !== name;
            if (changed) {
                this._versionSequence.next();
                this._createGroupNameStatusMessage(oldName, name, createdAt);

                await this._scheduleOutgoingGroupTask(
                    {name},
                    {
                        currentMembers: this.lifetimeGuard.run((handle) => handle.view().members),
                        addedMembers: new Set(),
                        removedMembers: new Set(),
                    },
                );
            }
            // We return true even if the name did not change since a sync update of the same name
            // is not considered a failure.
            return true;
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
            this.name.direct(name, createdAt);
        },
        direct: (name, createdAt) => {
            this.lifetimeGuard.run((guardedStoreHandle) => {
                const changed = this._updateName(guardedStoreHandle, name, createdAt);
                if (changed) {
                    this._versionSequence.next();
                }
            });
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
        fromSync: (handle, createdAt) => {
            this._log.debug('GroupModelController: Leave from sync');
            this.leave.direct(createdAt);
        },
        direct: (createdAt) => {
            this.lifetimeGuard.run((guardedStoreHandle) => {
                this._update(guardedStoreHandle, {userState: GroupUserState.LEFT});
                this._addUserStateChangedStatusMessage(GroupUserState.LEFT, createdAt);
                this._versionSequence.next();
            });
        },
    };

    /** @inheritdoc */
    public readonly disband: GroupController['disband'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromSync: (handle) => {
            this._log.debug('GroupModelController: disband from sync');
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

    private _setMembers(
        handle: GuardedStoreHandle<GroupView>,
        added: readonly ModelStore<Contact>[],
        removed: readonly ModelStore<Contact>[],
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
        updatedGroupMembers: ReadonlySet<ModelStore<Contact>>,
        date: Date,
        newUserState?: GroupUserState.MEMBER,
        memberStateHints?: ReadonlyMap<IdentityString, GroupMemberState>,
    ): {readonly added: u53; readonly removed: u53} {
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

        const {membersToAdd, membersToRemove} = this._diffMembers(
            guardedGroupViewStoreHandle,
            updatedGroupMembers,
        );

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
        const membersThatLeft: ModelStore<Contact>[] = [];
        const kickedMembers = membersToRemove.filter((member) => {
            const memberStateHint = memberStateHints?.get(member.get().view.identity);
            if (memberStateHint === GroupMemberState.LEFT) {
                membersThatLeft.push(member);
                return false;
            }
            return true;
        });
        this._addGroupMembersLeftStatusMessage(membersThatLeft, date);
        this._addGroupMemberChangeStatusMessage(membersToAdd, kickedMembers, date);

        return {added: membersToAdd.length + addedCount, removed: membersToRemove.length};
    }

    private _diffMembers(
        guardedGroupViewStoreHandle: GuardedStoreHandle<GroupView>,
        updatedGroupMembers: ReadonlySet<ModelStore<Contact>>,
    ): {
        readonly membersToAdd: readonly ModelStore<Contact>[];
        readonly membersToRemove: readonly ModelStore<Contact>[];
    } {
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

        return {membersToAdd, membersToRemove};
    }

    /**
     * Remove members from a group and update the view.
     *
     * Returns the number of removed contacts.
     *
     * Note: Triggers a `group-members-left-change` status message if a new member was removed.
     */
    private _removeMembers(
        handle: GuardedStoreHandle<GroupView>,
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
        this._addGroupMembersLeftStatusMessage(removed, createdAt);

        return numRemoved;
    }

    /**
     * Relect and commit a group udate.
     *
     * Returns the list of added and removed members for convenience, or `failed` if the update
     * failed.
     */
    private async _reflectAndCommitGroupUpdate(
        changes: GroupCreateOrUpdateFromLocal,
        updatedMemberSet?: ReadonlySet<ModelStore<Contact>>,
        profilePicture?:
            | D2dRemoveProfilePicture
            | (D2dSetProfilePicture & {readonly profilePictureBytes: ReadonlyUint8Array}),
    ): Promise<
        | {
              readonly addedMembers: readonly ModelStore<Contact>[];
              readonly removedMembers: readonly ModelStore<Contact>[];
          }
        | 'failed'
    > {
        return await this._lock.with(async () => {
            // Precondition: Abort if the group has been left or does not exist.
            const precondition = (): boolean => {
                const group_ = this._services.model.groups.getByUid(this.uid);
                return (
                    group_ !== undefined && group_.get().view.userState === GroupUserState.MEMBER
                );
            };

            let membersToAdd: readonly ModelStore<Contact>[] = [];
            let membersToRemove: readonly ModelStore<Contact>[] = [];
            if (updatedMemberSet !== undefined) {
                const memberDiff = this.lifetimeGuard.run((handle) =>
                    this._diffMembers(handle, updatedMemberSet),
                );
                membersToAdd = memberDiff.membersToAdd;
                membersToRemove = memberDiff.membersToRemove;
            }

            const task = new ReflectGroupSyncTransactionTask(this._services, precondition, {
                type: 'update',
                conversationUpdate: {},
                creatorIdentity: this._services.device.identity.string,
                groupUpdate: changes,
                memberUpdates:
                    updatedMemberSet === undefined
                        ? undefined
                        : {
                              // Since hasMemberChanges is true, updatedMemberSet cannot be undefined.
                              updatedMemberList: [...unwrap(updatedMemberSet)].map(
                                  (member) => member.get().view.identity,
                              ),
                              addedIdentities: [...membersToAdd].map(
                                  (member) => member.get().view.identity,
                              ),
                              removedIdentities: [...membersToRemove].map(
                                  (member) => member.get().view.identity,
                              ),
                          },
                groupId: this._groupId,
                profilePictureUpdate: profilePicture,
            });
            const success = await this._services.taskManager.schedule(task);

            // Nothing to do regarding group-call steps when members are removed as the group-call
            // handles them intriniscally.

            switch (success) {
                case 'success':
                    this.lifetimeGuard.run((handle) => {
                        this._update(handle, changes);
                        this._setMembers(handle, membersToAdd, membersToRemove);
                    });
                    if (profilePicture !== undefined) {
                        switch (profilePicture.type) {
                            case 'removed':
                                this.profilePicture
                                    .get()
                                    .controller.removePicture.direct('admin-defined');
                                break;
                            case 'set':
                                this.profilePicture
                                    .get()
                                    .controller.setPicture.direct(
                                        profilePicture.profilePictureBytes,
                                        'admin-defined',
                                    );
                                break;
                            default:
                                unreachable(profilePicture);
                        }
                    }
                    break;
                case 'aborted':
                    this._log.error('Failed to update group due to synchronization conflict');
                    return 'failed';
                default:
                    return unreachable(success);
            }
            return {addedMembers: membersToAdd, removedMembers: membersToRemove};
        });
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

    private _refreshDefaultDisplayName(handle: GuardedStoreHandle<GroupView>): void {
        const {name, userState, creator} = handle.view();
        const members = getGroupMembers(this._services, this.uid);
        handle.update(() => ({
            displayName: getDisplayName(name, userState, creator, members, this._services),
        }));
    }

    private _createGroupNameStatusMessage(oldName: string, newName: string, createdAt: Date): void {
        if (oldName !== newName) {
            this.conversation().get().controller.createStatusMessage({
                type: StatusMessageType.GROUP_NAME_CHANGED,
                value: {
                    oldName,
                    newName,
                },
                createdAt,
            });
        }
    }

    private _createProfilePictureChangeStatusMessage(
        change: ProfilePictureChange,
        createdAt: Date,
    ): void {
        this.conversation().get().controller.createStatusMessage({
            type: StatusMessageType.GROUP_PROFILE_PICTURE_CHANGED,
            value: {
                change,
            },
            createdAt,
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
        this._createGroupNameStatusMessage(oldName, name, createdAt);
        return oldName !== name;
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
        added: readonly ModelStore<Contact>[],
        removed: readonly ModelStore<Contact>[],
        createdAt: Date,
    ): void {
        const groupConversation = this.conversation().get();

        if (added.length === 0 && removed.length === 0) {
            this._log.debug(
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

    private _addGroupMembersLeftStatusMessage(
        left: readonly ModelStore<Contact>[],
        createdAt: Date,
    ): void {
        if (left.length === 0) {
            this._log.debug(
                'Trying to create an empty group members left status message without members',
            );
            return;
        }
        const groupConversation = this.conversation().get();
        groupConversation.controller.createStatusMessage({
            type: StatusMessageType.GROUP_MEMBERS_LEFT,
            value: {
                left: left.map((contactModelStore) => contactModelStore.get().view.identity),
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

    private async _scheduleOutgoingGroupTask(
        changes: GroupCreateOrUpdateFromLocal,
        membersChanges: {
            readonly currentMembers: ReadonlySet<ModelStore<Contact>>;
            readonly addedMembers: ReadonlySet<ModelStore<Contact>>;
            readonly removedMembers: ReadonlySet<ModelStore<Contact>>;
        },
    ): Promise<void> {
        // TODO(DESK-1853): Don't create a CSP-task in notes groups.
        //
        // Because iOS does not implement the group-sync protocol yet, we need to reflect a CSP
        // message even if we don't send a CSP message. This means that we cannot abort early here
        // yet if this is a notes group.

        // Precondition: Abort if the group has been left or does not exist.
        const precondition = (): boolean => {
            const group_ = this._services.model.groups.getByUid(this.uid);
            return group_ !== undefined && group_.get().view.userState === GroupUserState.MEMBER;
        };

        // Propagate the change to all members through the CSP protocol.
        const task = new OutgoingGroupCreateOrUpdateTask(
            this._services,
            'update',
            changes,
            membersChanges,
            this._groupId,
            precondition,
        );

        await this._services.taskManager.schedule(task).catch(() => {
            // Ignore (task should persist)
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

        fromLocal: async (
            init: Pick<GroupInit, 'name'>,
            members: ModelStore<Contact>[],
            profilePictureBytes,
        ) => {
            this._log.debug('Add group from local');

            const groupId = randomGroupId(this._services.crypto);
            const groupInit: GroupInit = {
                category: ConversationCategory.DEFAULT,
                visibility: ConversationVisibility.SHOW,
                colorIndex: idColorIndex({
                    type: ReceiverType.GROUP,
                    creatorIdentity: this._services.device.identity.string,
                    groupId,
                }),
                createdAt: new Date(),
                creator: 'me',
                groupId,
                name: init.name,
                userState: GroupUserState.MEMBER,
            };

            let profilePicture = undefined;
            if (profilePictureBytes !== undefined) {
                const profilePictureInformation = await encryptAndUploadBlob(
                    this._services,
                    profilePictureBytes,
                    BLOB_FILE_NONCE,
                    'public-persistent',
                );
                profilePicture = {
                    type: 'set',
                    blob: {
                        blobId: profilePictureInformation.id,
                        key: profilePictureInformation.key,
                        nonce: BLOB_FILE_NONCE,
                        uploadedAt: new Date(),
                    },
                    profilePictureBytes,
                } as const;
            }

            const group = await this._reflectAndCommitGroupCreate(
                groupInit,
                members,
                profilePicture,
            );

            if (group === undefined) {
                return undefined;
            }

            // TODO(DESK-1853): Don't create a CSP-task in notes groups.
            //
            // Because iOS does not implement the group-sync protocol yet, we need to reflect a CSP
            // message even if we don't send a CSP message. This means that we cannot abort early
            // here yet if this is a notes group.
            //
            // Note: The below precondition is less strict than in the protocol. We cannot omit this
            // step in empty groups due to the version mismatch with iOS (see comment above).

            // Precondition: Abort if the group has been left or does not exist.
            const precondition = (): boolean =>
                this._services.model.groups.getByUid(group.ctx) !== undefined &&
                group.get().view.userState === GroupUserState.MEMBER;

            const task = new OutgoingGroupCreateOrUpdateTask(
                this._services,
                'create',
                {
                    ...groupInit,
                    profilePictureChange:
                        profilePicture === undefined
                            ? undefined
                            : {
                                  type: 'set',
                                  blob: {...profilePicture.blob},
                                  // Unwrap is fine because we check it above.
                                  pictureBytes: unwrap(profilePictureBytes),
                              },
                },
                {
                    currentMembers: new Set(members),
                    addedMembers: new Set(members),
                    removedMembers: new Set(),
                },
                group.get().view.groupId,
                precondition,
            );
            await this._services.taskManager.schedule(task).catch(() => {
                // Ignore (task should persist)
            });
            return group;
        },

        // eslint-disable-next-line @typescript-eslint/require-await
        fromRemote: async (handle, init: GroupInit, members: ModelStore<Contact>[]) => {
            this._log.debug('Add group from remote');
            return create(
                this._services,
                ensureExactGroupInit(init),
                members,
                undefined,
                this._log,
            );
        },

        fromSync: (handle, init: GroupInit, members: ModelStore<Contact>[]) => {
            this._log.debug('Add group from sync');
            return this.add.direct(init, members);
        },
        direct: (init: GroupInit, members: ModelStore<Contact>[]) =>
            create(this._services, ensureExactGroupInit(init), members, undefined, this._log),
    };

    public readonly disband: GroupRepository['disband'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async (uid, intent) => {
            this._log.debug(`GroupModelRepository: ${intent} from local`);
            const group = this.getByUid(uid);
            if (group === undefined) {
                this._log.error('Group to be disbanded does not exist');
                return false;
            }

            if (
                group.get().view.creator !== 'me' ||
                group.get().view.userState !== GroupUserState.MEMBER
            ) {
                this._log.error('Group can only be disbanded by the creator');
                return false;
            }

            const success = await this._reflectAndCommitGroupLeave(
                group,
                intent === 'disband'
                    ? {type: 'update', shouldDelete: false}
                    : {type: 'delete', shouldDelete: true},
            );

            if (!success) {
                return false;
            }

            const cspTask = new OutgoingGroupDisbandTask(this._services, group.get());

            this._services.taskManager.schedule(cspTask).catch(() => {
                // Ignore (task should persist)
            });

            // Remove all associated data from current session if this was the intent.
            if (intent === 'disband-and-delete') {
                conversation.deactivateAndPurgeCacheCascade(
                    this._services,
                    {type: ReceiverType.GROUP, uid: group.ctx},
                    group.get().controller.conversation(),
                    this._log,
                );
            }

            return true;
        },
    };

    public readonly leave: GroupRepository['leave'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async (uid, intent) => {
            this._log.debug(`GroupModelRepository: ${intent} from local`);
            const group = this.getByUid(uid);
            if (group === undefined) {
                this._log.error('Group to be left does not exist');
                return false;
            }

            if (
                group.get().view.creator === 'me' ||
                group.get().view.userState !== GroupUserState.MEMBER
            ) {
                this._log.error('Group can only be disbanded by the creator');
                return false;
            }

            const success = await this._reflectAndCommitGroupLeave(
                group,
                intent === 'leave'
                    ? {type: 'update', shouldDelete: false}
                    : {type: 'delete', shouldDelete: true},
            );

            if (!success) {
                return false;
            }

            const cspTask = new OutgoingGroupLeaveTask(this._services, group.get());

            this._services.taskManager.schedule(cspTask).catch(() => {
                // Ignore (task should persist)
            });

            // Remove all associated data from current session if this was the intent.
            if (intent === 'leave-and-delete') {
                conversation.deactivateAndPurgeCacheCascade(
                    this._services,
                    {type: ReceiverType.GROUP, uid: group.ctx},
                    group.get().controller.conversation(),
                    this._log,
                );
            }

            return true;
        },
    };

    public readonly remove: GroupRepository['remove'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async (uid) => {
            // Note: The following steps are not in the protocol yet.
            this._log.debug(`GroupModelRepository: Deleting from local`);
            const group = this.getByUid(uid);
            if (group === undefined) {
                this._log.error('Group to be deleted does not exist');
                return false;
            }

            const task = new ReflectGroupSyncTransactionTask(
                this._services,
                () => this.getByUid(group.ctx) !== undefined,
                {
                    type: 'delete',
                    creatorIdentity: getIdentityString(
                        this._services.device,
                        group.get().view.creator,
                    ),
                    groupId: group.get().view.groupId,
                },
            );

            const result = await this._services.taskManager.schedule(task);

            switch (result) {
                case 'success':
                    remove(this._services, group.ctx);
                    break;
                case 'aborted':
                    this._log.error('Failed to delete group due to a synchronization error');
                    return false;
                default:
                    return unreachable(result);
            }

            conversation.deactivateAndPurgeCacheCascade(
                this._services,
                {type: ReceiverType.GROUP, uid: group.ctx},
                group.get().controller.conversation(),
                this._log,
            );
            return true;
        },

        fromSync: (handle, uid) => {
            this._log.debug('Removing group from sync');
            const group = this.getByUid(uid);
            if (group === undefined) {
                this._log.error('Group to be deleted does not exist');
                return false;
            }
            remove(this._services, uid);
            conversation.deactivateAndPurgeCacheCascade(
                this._services,
                {type: ReceiverType.GROUP, uid: group.ctx},
                group.get().controller.conversation(),
                this._log,
            );
            return true;
        },
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

    private async _reflectAndCommitGroupCreate(
        groupInit: GroupInit,
        members: ModelStore<Contact>[],
        profilePicture?: D2dSetProfilePicture & {readonly profilePictureBytes: ReadonlyUint8Array},
    ): Promise<ModelStore<Group> | undefined> {
        // Precondition: If a group with group-id and the user as creator exists, log an error and
        // abort these steps.
        const precondition = (): boolean =>
            this.getByGroupIdAndCreator(
                groupInit.groupId,
                getIdentityString(this._services.device, groupInit.creator),
            ) === undefined;

        // Reflect a groupSync.Create
        const task = new ReflectGroupSyncTransactionTask(this._services, precondition, {
            type: 'create',
            creatorIdentity: this._services.device.identity.string,
            groupId: groupInit.groupId,
            memberIdentities: new Set([...members].map((member) => member.get().view.identity)),
            name: groupInit.name,
            profilePicture,
        });

        const success = await this._services.taskManager.schedule(task);
        switch (success) {
            case 'success':
                return create(
                    this._services,
                    ensureExactGroupInit(groupInit),
                    [...members],
                    profilePicture?.profilePictureBytes,
                    this._log,
                );
            case 'aborted':
                this._log.error('Cannot create group because precondition failed, aborting');
                return undefined;
            default:
                return unreachable(success);
        }
    }

    /**
     * Leaves (or disbands) a group.
     *
     * If `shouldDelete` is true, the group is removed from the database with all associated data.
     * Removing and deactivating the ModelStore is responsibility of the caller.
     */
    private async _reflectAndCommitGroupLeave(
        group: ModelStore<Group>,
        mode:
            | {
                  readonly type: 'update';
                  readonly shouldDelete: false;
              }
            | {
                  readonly type: 'delete';
                  readonly shouldDelete: true;
              },
    ): Promise<boolean> {
        // Precondition: If the group does not exist or the group is marked as left, log a warning
        // and abort these steps.
        const precondtion = (): boolean => {
            const group_ = this._services.model.groups.getByUid(group.ctx);
            return group_ !== undefined && group_.get().view.userState === GroupUserState.MEMBER;
        };

        const creatorIdentity = getIdentityString(this._services.device, group.get().view.creator);

        let task: ReflectGroupSyncTransactionTask;
        switch (mode.type) {
            case 'update':
                task = new ReflectGroupSyncTransactionTask(this._services, precondtion, {
                    type: 'update',
                    conversationUpdate: {},
                    creatorIdentity,
                    groupId: group.get().view.groupId,
                    groupUpdate: {userState: GroupUserState.LEFT},
                    memberUpdates: undefined,
                });
                break;
            case 'delete':
                task = new ReflectGroupSyncTransactionTask(this._services, precondtion, {
                    type: 'delete',
                    creatorIdentity,
                    groupId: group.get().view.groupId,
                });
                break;
            default:
                unreachable(mode);
        }

        const result = await this._services.taskManager.schedule(task);

        // Nothing to do regarding group-call steps when members are removed as the group-call
        // handles them intriniscally.

        switch (result) {
            case 'success':
                if (mode.shouldDelete) {
                    // TODO(DESK-1824) Make sure the group is not needed anymore after deleting the
                    // corresponding database entry.
                    //
                    // anyway, we can delete the underlying data from the database here and pass
                    // still existing model to the next task. As soon as we have persistence, we
                    // need to change this.
                    remove(this._services, group.ctx);
                } else {
                    group.get().controller.leave.direct(new Date());
                }
                return true;
            case 'aborted':
                this._log.error('Failed to delete group due to a synchronization error');
                return false;
            default:
                return unreachable(result);
        }
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
