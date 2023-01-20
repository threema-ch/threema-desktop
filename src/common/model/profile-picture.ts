import {
    type DbContact,
    type DbContactUid,
    type DbGroup,
    type DbGroupUid,
    type DbReceiverLookup,
    type DbUpdate,
} from '~/common/db';
import {ReceiverType, TriggerSource} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {
    type ContactView,
    type GroupView,
    type IProfilePictureRepository,
    type ProfilePicture,
    type ProfilePictureController,
    type ProfilePictureSource,
    type ProfilePictureView,
    type ServicesForModel,
} from '~/common/model';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type BlobId} from '~/common/network/protocol/blob';
import {type ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {type ProfilePictureUpdate} from '~/common/network/protocol/task/d2d/reflect-contact-sync';
import {ReflectContactSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-contact-sync-transaction';
import {type ConversationId, type IdentityString} from '~/common/network/types';
import {type RawBlobKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array, type u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {idColorIndexToString} from '~/common/utils/id-color';
import {AsyncLock} from '~/common/utils/lock';
import {hasProperty} from '~/common/utils/object';
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
    contact: Pick<
        DbContact,
        | 'identity'
        | 'profilePictureContactDefined'
        | 'profilePictureGatewayDefined'
        | 'profilePictureUserDefined'
    >,
): ReadonlyUint8Array | undefined {
    if (contact.profilePictureContactDefined !== undefined) {
        return contact.profilePictureContactDefined;
    }
    if (contact.identity.startsWith('*') && contact.profilePictureGatewayDefined !== undefined) {
        return contact.profilePictureGatewayDefined;
    }
    if (!contact.identity.startsWith('*') && contact.profilePictureUserDefined !== undefined) {
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
    if (hasProperty(change, 'profilePictureContactDefined')) {
        dbChange.profilePictureContactDefined = change.profilePictureContactDefined;
    }
    if (hasProperty(change, 'profilePictureGatewayDefined')) {
        dbChange.profilePictureGatewayDefined = change.profilePictureGatewayDefined;
    }
    if (hasProperty(change, 'profilePictureUserDefined')) {
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
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<ProfilePictureView>();

    /** @inheritdoc */
    public readonly setPicture: ProfilePictureController['setPicture'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,

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
                        'TODO(WEBMD-236): Distribution list profile pictures not yet implemented',
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
                        'TODO(WEBMD-236): Distribution list profile pictures not yet implemented',
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
                        'TODO(WEBMD-236): Distribution list profile pictures not yet implemented',
                    );
                default:
                    unreachable(this._receiver);
            }
            return undefined;
        },
    };

    /** @inheritdoc */
    public readonly removePicture: ProfilePictureController['removePicture'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,

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
                        'TODO(WEBMD-236): Distribution list profile pictures not yet implemented',
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
                        'TODO(WEBMD-236): Distribution list profile pictures not yet implemented',
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
    private readonly _version = new SequenceNumberU53<u53>(0);

    /**
     * Instantiate the ProfilePictureModelController.
     */
    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _receiver: DbReceiverLookup & ConversationId,
    ) {
        switch (_receiver.type) {
            case ReceiverType.CONTACT:
                this._log = _services.logging.logger(
                    `model.contact.${_receiver.uid}.profile-picture`,
                );
                break;
            case ReceiverType.GROUP:
                this._log = _services.logging.logger(
                    `model.group.${_receiver.uid}.profile-picture`,
                );
                break;
            case ReceiverType.DISTRIBUTION_LIST:
                this._log = _services.logging.logger(
                    `model.distribution-list.${_receiver.uid}.profile-picture`,
                );
                break;
            default:
                unreachable(_receiver);
        }
    }

    /**
     * Persist the profile picture change.
     */
    private _persistProfilePicture(
        bytes: ReadonlyUint8Array | undefined,
        source: ProfilePictureSource,
    ): void {
        this.meta.update((view) => {
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
            this._version.next();

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
            const currentVersion = this._version.current;
            const precondition = (): boolean =>
                this.meta.active && this._version.current === currentVersion;

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
                return contact === undefined ? undefined : chooseContactProfilePicture(contact);
            }
            case ReceiverType.GROUP:
                return db.getGroupByUid(this._receiver.uid)?.profilePictureAdminDefined;
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(WEBMD-236): Implement distribution lists');
            default:
                return unreachable(this._receiver);
        }
    }
}

export class ProfilePictureModelStore extends LocalModelStore<ProfilePicture> {
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
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}

/** @inheritdoc */
export class ProfilePictureModelRepository implements IProfilePictureRepository {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _contactCache = new LocalModelStoreCache<
            DbContactUid,
            LocalModelStore<ProfilePicture>
        >(),
        private readonly _groupCache = new LocalModelStoreCache<
            DbGroupUid,
            LocalModelStore<ProfilePicture>
        >(),
    ) {}

    /** @inheritdoc */
    public getForContact(
        uid: DbContactUid,
        view: Pick<ContactView, 'identity' | 'colorIndex'>,
    ): LocalModelStore<ProfilePicture> {
        return this._contactCache.getOrAdd(uid, () => {
            const profilePicture = {
                color: idColorIndexToString(view.colorIndex),
                picture: chooseContactProfilePicture(view),
            };
            return new ProfilePictureModelStore(
                this._services,
                {
                    type: ReceiverType.CONTACT,
                    uid,
                    identity: view.identity,
                },
                profilePicture,
            );
        });
    }

    /** @inheritdoc */
    public getForGroup(
        uid: DbGroupUid,
        view: Pick<GroupView, 'creatorIdentity' | 'groupId' | 'colorIndex'>,
    ): LocalModelStore<ProfilePicture> {
        return this._groupCache.getOrAdd(uid, () => {
            const profilePicture = {
                color: idColorIndexToString(view.colorIndex),
                picture: undefined, // TODO(WEBMD-528): Group profile pictures
            };
            return new ProfilePictureModelStore(
                this._services,
                {
                    type: ReceiverType.GROUP,
                    uid,
                    creatorIdentity: view.creatorIdentity,
                    groupId: view.groupId,
                },
                profilePicture,
            );
        });
    }
}
