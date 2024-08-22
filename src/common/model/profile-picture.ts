import type {
    DbContact,
    DbContactUid,
    DbGroup,
    DbGroupUid,
    DbReceiverLookup,
    DbUpdate,
} from '~/common/db';
import {ReceiverType, TriggerSource} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    ProfilePicture,
    ProfilePictureController,
    ProfilePictureSource,
    ProfilePictureView,
} from '~/common/model/types/profile-picture';
import {getDebugTagForReceiver} from '~/common/model/utils/debug-tags';
import {ModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {BlobId} from '~/common/network/protocol/blob';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import type {ProfilePictureUpdate} from '~/common/network/protocol/task/d2d/reflect-contact-sync';
import {ReflectContactSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-contact-sync-transaction';
import type {ConversationId, GroupId, IdentityString} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array, u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import {idColorIndexToString} from '~/common/utils/id-color';
import {AsyncLock} from '~/common/utils/lock';
import {hasPropertyStrict} from '~/common/utils/object';
import {SequenceNumberU53} from '~/common/utils/sequence-number';

/**
 * Return the appropriate profile picture for this contact.
 *
 * Precedence:
 *
 * 1. Contact-defined profile picture
 * 2. If Gateway-ID: Gateway-defined profile picture
 * 3. If Non-Gateway-ID: User-defined profile picture
 *
 * See section "Contact Profile Picture Precedence" in the protocol description.
 */
export function chooseContactProfilePicture(
    identity: IdentityString,
    contact: ContactProfilePictureFields,
): ReadonlyUint8Array | undefined {
    if (contact.profilePictureContactDefined !== undefined) {
        return contact.profilePictureContactDefined;
    }
    if (identity.startsWith('*') && contact.profilePictureGatewayDefined !== undefined) {
        return contact.profilePictureGatewayDefined;
    }
    if (!identity.startsWith('*') && contact.profilePictureUserDefined !== undefined) {
        return contact.profilePictureUserDefined;
    }
    return undefined;
}

/**
 * Update contact profile picture in the database.
 */
function updateContactProfilePicture(
    services: ServicesForModel,
    contactUid: DbContactUid,
    change: Pick<
        DbContact,
        | 'profilePictureContactDefined'
        | 'profilePictureGatewayDefined'
        | 'profilePictureUserDefined'
    >,
): void {
    const {db} = services;
    const dbChange: DbUpdate<DbContact> = {
        uid: contactUid,
    };
    if (hasPropertyStrict(change, 'profilePictureContactDefined')) {
        dbChange.profilePictureContactDefined = change.profilePictureContactDefined;
    }
    if (hasPropertyStrict(change, 'profilePictureGatewayDefined')) {
        dbChange.profilePictureGatewayDefined = change.profilePictureGatewayDefined;
    }
    if (hasPropertyStrict(change, 'profilePictureUserDefined')) {
        dbChange.profilePictureUserDefined = change.profilePictureUserDefined;
    }
    db.updateContact(dbChange);
}

/**
 * Update group profile picture in the database.
 */
function updateGroupProfilePicture(
    services: ServicesForModel,
    contactUid: DbGroupUid,
    profilePictureAdminDefined: ReadonlyUint8Array | undefined,
): void {
    const {db} = services;
    const dbChange: DbUpdate<DbGroup> = {
        uid: contactUid,
        profilePictureAdminDefined,
    };
    db.updateGroup(dbChange);
}

export class ProfilePictureModelController implements ProfilePictureController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<ProfilePictureView>();

    /** @inheritdoc */
    public readonly setPicture: ProfilePictureController['setPicture'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async (profilePicture: ReadonlyUint8Array, source: ProfilePictureSource) => {
            this._log.debug(`ProfilePictureModelController: Set ${source} picture from local`);
            switch (this._receiver.type) {
                case ReceiverType.CONTACT:
                    assert(
                        source === 'user-defined',
                        `${source} contact profile picture cannot be set with fromLocal`,
                    );
                    return await this._reflectAndPersistContactProfilePicture(
                        this._receiver.identity,
                        {
                            triggerSource: TriggerSource.LOCAL,
                            pictureSource: source,
                            profilePicture,
                        },
                    );
                case ReceiverType.GROUP:
                    throw new Error('Group profile pictures cannot be set with fromLocal');
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error(
                        'TODO(DESK-236): Distribution list profile pictures not yet implemented',
                    );
                default:
                    return unreachable(this._receiver);
            }
        },

        fromRemote: async (
            handle,
            profilePicture: {
                readonly bytes: ReadonlyUint8Array;
                readonly blobId: BlobId;
                readonly blobKey: RawBlobKey;
            },
            source: ProfilePictureSource,
        ) => {
            this._log.debug(`ProfilePictureModelController: Set ${source} picture from remote`);
            switch (this._receiver.type) {
                case ReceiverType.CONTACT:
                    assert(
                        source === 'contact-defined',
                        `${source} profile picture cannot be set with fromRemote`,
                    );
                    await this._reflectAndPersistContactProfilePicture(this._receiver.identity, {
                        triggerSource: TriggerSource.REMOTE,
                        pictureSource: source,
                        handle,
                        profilePicture,
                    });
                    break;
                case ReceiverType.GROUP:
                    assert(
                        source === 'admin-defined',
                        `${source} profile picture cannot be set for groups`,
                    );
                    // Note: No group sync required here, because we reflect the incoming
                    // group-set-profile-picture message instead.
                    this._persistProfilePicture(profilePicture.bytes, source);
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error(
                        'TODO(DESK-236): Distribution list profile pictures not yet implemented',
                    );
                default:
                    unreachable(this._receiver);
            }
            return undefined;
        },

        fromSync: (profilePicture: ReadonlyUint8Array, source: ProfilePictureSource) => {
            this._log.debug(`ProfilePictureModelController: Set ${source} picture from sync`);
            switch (this._receiver.type) {
                case ReceiverType.CONTACT:
                    // Note: Profile pictures from gateway aren't reflected, because these are being
                    // independently fetched from the web API by every client. Thus, "fromSync" is the
                    // proper call for such updates.
                    this._persistProfilePicture(profilePicture, source);
                    break;
                case ReceiverType.GROUP:
                    assert(
                        source === 'admin-defined',
                        `${source} profile picture cannot be set for groups`,
                    );
                    this._persistProfilePicture(profilePicture, source);
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error(
                        'TODO(DESK-236): Distribution list profile pictures not yet implemented',
                    );
                default:
                    unreachable(this._receiver);
            }
            return undefined;
        },
    };

    /** @inheritdoc */
    public readonly removePicture: ProfilePictureController['removePicture'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async (source: ProfilePictureSource) => {
            this._log.debug(`ProfilePictureModelController: Remove ${source} picture from local`);
            switch (this._receiver.type) {
                case ReceiverType.CONTACT:
                    assert(
                        source === 'user-defined',
                        `${source} profile picture cannot be removed with fromLocal`,
                    );
                    return await this._reflectAndPersistContactProfilePicture(
                        this._receiver.identity,
                        {
                            triggerSource: TriggerSource.LOCAL,
                            pictureSource: source,
                            profilePicture: undefined,
                        },
                    );
                case ReceiverType.GROUP:
                    throw new Error('Group profile pictures cannot be removed with fromLocal');
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error(
                        'TODO(DESK-236): Distribution list profile pictures not yet implemented',
                    );
                default:
                    return unreachable(this._receiver);
            }
        },

        fromRemote: async (handle, source: ProfilePictureSource) => {
            this._log.debug(`ProfilePictureModelController: Remove ${source} picture from remote`);
            switch (this._receiver.type) {
                case ReceiverType.CONTACT:
                    assert(
                        source === 'contact-defined',
                        `${source} profile picture cannot be removed with fromRemote`,
                    );
                    await this._reflectAndPersistContactProfilePicture(this._receiver.identity, {
                        triggerSource: TriggerSource.REMOTE,
                        pictureSource: source,
                        handle,
                        profilePicture: undefined,
                    });
                    break;
                case ReceiverType.GROUP:
                    assert(
                        source === 'admin-defined',
                        `${source} profile picture cannot be removed for groups`,
                    );
                    // Note: No group sync required here, because we reflect the incoming
                    // group-delete-profile-picture message instead.
                    this._persistProfilePicture(undefined, source);
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error(
                        'TODO(DESK-236): Distribution list profile pictures not yet implemented',
                    );
                default:
                    return unreachable(this._receiver);
            }
            return undefined;
        },

        fromSync: (source: ProfilePictureSource) => {
            this._log.debug(`ProfilePictureModelController: Remove ${source} picture from sync`);
            this._persistProfilePicture(undefined, source);
        },
    };

    private readonly _lock = new AsyncLock();
    private readonly _log: Logger;

    /**
     * A version counter that should be incremented for every profile picture update.
     */
    private readonly _versionSequence = new SequenceNumberU53<u53>(0);

    /**
     * Instantiate the ProfilePictureModelController.
     */
    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _receiver: DbReceiverLookup & ConversationId,
    ) {
        this._log = _services.logging.logger(
            `model.${getDebugTagForReceiver(_receiver)}.profile-picture`,
        );
    }

    /**
     * Persist the profile picture change.
     */
    private _persistProfilePicture(
        bytes: ReadonlyUint8Array | undefined,
        source: ProfilePictureSource,
    ): void {
        this.lifetimeGuard.update((view) => {
            // Update database
            switch (this._receiver.type) {
                case ReceiverType.CONTACT: {
                    let change;
                    switch (source) {
                        case 'contact-defined':
                            change = {profilePictureContactDefined: bytes};
                            break;
                        case 'gateway-defined':
                            change = {profilePictureGatewayDefined: bytes};
                            break;
                        case 'user-defined':
                            change = {profilePictureUserDefined: bytes};
                            break;
                        case 'admin-defined':
                            throw new Error(
                                `Cannot set admin-defined profile picture for a contact!`,
                            );
                        default:
                            unreachable(source);
                    }
                    updateContactProfilePicture(this._services, this._receiver.uid, change);
                    break;
                }
                case ReceiverType.GROUP:
                    assert(
                        source === 'admin-defined',
                        `Cannot set ${source} profile picture for a group!`,
                    );
                    updateGroupProfilePicture(this._services, this._receiver.uid, bytes);
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    assert(
                        source === 'user-defined',
                        `Cannot set ${source} profile picture for a distribution list!`,
                    );
                    break;
                default:
                    unreachable(this._receiver);
            }

            // Increment version
            this._versionSequence.next();

            // Update view
            this._log.debug(`Updated ${source} profile picture`);
            return {...view, picture: this._loadProfilePicture()};
        });
    }

    /**
     * Reflect contact profile picture, then persist the change.
     */
    private async _reflectAndPersistContactProfilePicture(
        identity: IdentityString,
        update:
            | {
                  readonly triggerSource: TriggerSource.LOCAL;
                  readonly pictureSource: 'user-defined';
                  readonly profilePicture: ReadonlyUint8Array | undefined;
              }
            | {
                  readonly triggerSource: TriggerSource.REMOTE;
                  readonly pictureSource: 'contact-defined';
                  readonly handle: ActiveTaskCodecHandle<'volatile'>;
                  readonly profilePicture:
                      | {
                            readonly bytes: ReadonlyUint8Array;
                            readonly blobId: BlobId;
                            readonly blobKey: RawBlobKey;
                        }
                      | undefined;
              },
    ): Promise<void> {
        const {taskManager} = this._services;

        await this._lock.with(async () => {
            // Precondition: The profile picture was not updated in the meantime
            const currentVersion = this._versionSequence.current;
            const precondition = (): boolean =>
                this.lifetimeGuard.active.get() && this._versionSequence.current === currentVersion;

            // Reflect contact update to other devices inside a transaction
            let profilePicture: ProfilePictureUpdate;
            switch (update.triggerSource) {
                case TriggerSource.LOCAL:
                    profilePicture = {
                        source: TriggerSource.LOCAL,
                        profilePictureUserDefined: update.profilePicture,
                    };
                    break;
                case TriggerSource.REMOTE:
                    profilePicture = {
                        source: TriggerSource.REMOTE,
                        profilePictureContactDefined:
                            update.profilePicture === undefined
                                ? undefined
                                : {
                                      bytes: update.profilePicture.bytes,
                                      blobId: update.profilePicture.blobId,
                                      blobKey: update.profilePicture.blobKey,
                                  },
                    };
                    break;
                default:
                    unreachable(update);
            }
            const syncTask = new ReflectContactSyncTransactionTask(this._services, precondition, {
                type: 'update-profile-picture',
                identity,
                profilePicture,
            });

            let result;
            switch (update.triggerSource) {
                case TriggerSource.LOCAL:
                    result = await taskManager.schedule(syncTask);
                    break;
                case TriggerSource.REMOTE:
                    result = await syncTask.run(update.handle);
                    break;
                default:
                    unreachable(update);
            }

            // Commit update if the transaction succeeded
            switch (result) {
                case 'success':
                    // Update locally
                    this._persistProfilePicture(
                        update.triggerSource === TriggerSource.LOCAL
                            ? update.profilePicture
                            : update.profilePicture?.bytes,
                        update.pictureSource,
                    );
                    break;
                case 'aborted':
                    // Synchronization conflict
                    throw new Error(
                        'Failed to update profile picture due to synchronization conflict',
                    );
                default:
                    unreachable(result);
            }
        });
    }

    /**
     * Load the appropriate profile picture bytes from the database.
     */
    private _loadProfilePicture(): ReadonlyUint8Array | undefined {
        const {db} = this._services;
        switch (this._receiver.type) {
            case ReceiverType.CONTACT: {
                const contact = db.getContactByUid(this._receiver.uid);
                return contact === undefined
                    ? undefined
                    : chooseContactProfilePicture(contact.identity, contact);
            }
            case ReceiverType.GROUP:
                return db.getGroupByUid(this._receiver.uid)?.profilePictureAdminDefined;
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(DESK-236): Implement distribution lists');
            default:
                return unreachable(this._receiver);
        }
    }
}

export class ProfilePictureModelStore extends ModelStore<ProfilePicture> {
    public constructor(
        services: ServicesForModel,
        receiver: DbReceiverLookup & ConversationId,
        profilePicture: ProfilePictureView,
    ) {
        const {logging} = services;
        const tag = 'profile-picture';
        super(
            profilePicture,
            new ProfilePictureModelController(services, receiver),
            undefined,
            undefined,
            {
                debug: {
                    log: logging.logger(`model.${getDebugTagForReceiver(receiver)}.${tag}`),
                    tag,
                },
            },
        );
    }
}

/** @inheritdoc */
export class ProfilePictureModelRepository implements ProfilePictureRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _contactCache = new ModelStoreCache<
            DbContactUid,
            ModelStore<ProfilePicture>
        >(),
        private readonly _groupCache = new ModelStoreCache<
            DbGroupUid,
            ModelStore<ProfilePicture>
        >(),
    ) {}

    /** @inheritdoc */
    public getForContact(
        uid: DbContactUid,
        identity: IdentityString,
        profilePictureData: ContactProfilePictureFields,
    ): ModelStore<ProfilePicture> {
        return this._contactCache.getOrAdd(uid, () => {
            const profilePicture = {
                color: idColorIndexToString(profilePictureData.colorIndex),
                picture: chooseContactProfilePicture(identity, profilePictureData),
            };
            return new ProfilePictureModelStore(
                this._services,
                {
                    type: ReceiverType.CONTACT,
                    uid,
                    identity,
                },
                profilePicture,
            );
        });
    }

    /** @inheritdoc */
    public getForGroup(
        uid: DbGroupUid,
        creatorIdentity: IdentityString,
        groupId: GroupId,
        profilePictureData: GroupProfilePictureFields,
    ): ModelStore<ProfilePicture> {
        return this._groupCache.getOrAdd(uid, () => {
            const profilePicture = {
                color: idColorIndexToString(profilePictureData.colorIndex),
                picture: profilePictureData.profilePictureAdminDefined,
            };
            return new ProfilePictureModelStore(
                this._services,
                {
                    type: ReceiverType.GROUP,
                    uid,
                    creatorIdentity,
                    groupId,
                },
                profilePicture,
            );
        });
    }
}

export type ContactProfilePictureFields = Pick<
    DbContact,
    | 'colorIndex'
    | 'profilePictureContactDefined'
    | 'profilePictureGatewayDefined'
    | 'profilePictureUserDefined'
>;

export type GroupProfilePictureFields = Pick<DbGroup, 'colorIndex' | 'profilePictureAdminDefined'>;

export type ProfilePictureRepository = {
    /**
     * Return the profile picture model store for the specified contact.
     */
    readonly getForContact: (
        uid: DbContactUid,
        identity: IdentityString,
        profilePictureData: ContactProfilePictureFields,
    ) => ModelStore<ProfilePicture>;

    /**
     * Return the profile picture model store for the specified group.
     */
    readonly getForGroup: (
        uid: DbGroupUid,
        creatorIdentity: IdentityString,
        groupId: GroupId,
        profilePictureData: GroupProfilePictureFields,
    ) => ModelStore<ProfilePicture>;
} & ProxyMarked;
