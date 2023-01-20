import {
    type DbContact,
    type DbContactReceiverLookup,
    type DbContactUid,
    type DbCreate,
    type DbCreateConversationMixin,
} from '~/common/db';
import {Existence, ReceiverType, TriggerSource} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type ConversationModelStore} from '~/common/model/conversation';
import * as conversation from '~/common/model/conversation';
import {type ContactProfilePictureFields} from '~/common/model/profile-picture';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {ReflectContactSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-contact-sync-transaction';
import {type IdentityString} from '~/common/network/types';
import {type NotificationTag, getNotificationTagForContact} from '~/common/notification';
import {type u53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {byteEquals} from '~/common/utils/byte';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {
    type Exact,
    createExactPropertyValidator,
    OPTIONAL,
    REQUIRED,
} from '~/common/utils/property-validator';
import {SequenceNumberU53} from '~/common/utils/sequence-number';
import {LocalSetStore} from '~/common/utils/store/set-store';
import {getGraphemeClusters} from '~/common/utils/string';

import {
    type Contact,
    type ContactController,
    type ContactInit,
    type ContactRepository,
    type ContactUpdate,
    type ContactView,
    type Conversation,
    type ProfilePicture,
    type ServicesForModel,
} from '.';

let cache = new LocalModelStoreCache<DbContactUid, LocalModelStore<Contact>>();

const ensureExactContactInit = createExactPropertyValidator<ContactInit>('ContactInit', {
    identity: REQUIRED,
    publicKey: REQUIRED,
    createdAt: REQUIRED,
    firstName: REQUIRED,
    lastName: REQUIRED,
    nickname: REQUIRED,
    colorIndex: REQUIRED,
    verificationLevel: REQUIRED,
    workVerificationLevel: REQUIRED,
    identityType: REQUIRED,
    acquaintanceLevel: REQUIRED,
    activityState: REQUIRED,
    featureMask: REQUIRED,
    syncState: REQUIRED,
    notificationTriggerPolicyOverride: OPTIONAL,
    notificationSoundPolicyOverride: OPTIONAL,
    lastUpdate: OPTIONAL,
    category: REQUIRED,
    visibility: REQUIRED,
});

const ensureExactContactUpdate = createExactPropertyValidator<ContactUpdate>('ContactUpdate', {
    createdAt: OPTIONAL,
    firstName: OPTIONAL,
    lastName: OPTIONAL,
    nickname: OPTIONAL,
    verificationLevel: OPTIONAL,
    workVerificationLevel: OPTIONAL,
    identityType: OPTIONAL,
    acquaintanceLevel: OPTIONAL,
    activityState: OPTIONAL,
    featureMask: OPTIONAL,
    syncState: OPTIONAL,
    notificationTriggerPolicyOverride: OPTIONAL,
    notificationSoundPolicyOverride: OPTIONAL,
});

function addDerivedData(contact: Omit<ContactView, 'displayName' | 'initials'>): ContactView {
    return {
        ...contact,
        displayName: getDisplayName(contact),
        initials: getInitials(contact),
    };
}

function create(services: ServicesForModel, init: Exact<ContactInit>): LocalModelStore<Contact> {
    const {config, db} = services;

    // Ensure the contact does not use the server's public key.
    //
    // Note: This is a legacy check which is no longer required with the new authentication
    //       variants, avoiding payload confusion. But it does not hurt to keep it. And it makes no
    //       sense to have a contact with the server's public key either.
    assert(
        !byteEquals(init.publicKey, config.CHAT_SERVER_KEY),
        "Expected new contact to not use the server's public key",
    );

    // Create the contact
    const contact: DbCreate<DbContact> & DbCreateConversationMixin = {
        ...init,
        type: ReceiverType.CONTACT,
    };
    const uid = db.createContact(contact);

    // Extract profile picture fields
    const profilePictureData: ContactProfilePictureFields = {
        colorIndex: contact.colorIndex,
        profilePictureContactDefined: contact.profilePictureContactDefined,
        profilePictureGatewayDefined: contact.profilePictureGatewayDefined,
        profilePictureUserDefined: contact.profilePictureUserDefined,
    };

    const contactStore = cache.add(
        uid,
        () => new ContactModelStore(services, addDerivedData(contact), uid, profilePictureData),
    );

    // Fetching the conversation implicitly updates the conversation set store and cache.
    contactStore.get().controller.conversation();

    return contactStore;
}

// Function overload with constrained return type based on existence.
export function getByUid<TExistence extends Existence>(
    services: ServicesForModel,
    uid: DbContactUid,
    existence: TExistence,
): TExistence extends Existence.ENSURED
    ? LocalModelStore<Contact>
    : LocalModelStore<Contact> | undefined;

/**
 * Fetch a contact model by its database UID.
 *
 * Note: Assumes that the database entry exists!
 */
export function getByUid(
    services: ServicesForModel,
    uid: DbContactUid,
    existence: Existence,
): LocalModelStore<Contact> | undefined {
    return cache.getOrAdd(uid, () => {
        const {db} = services;

        // Lookup the contact
        const contact = db.getContactByUid(uid);
        if (existence === Existence.ENSURED) {
            assert(contact !== undefined, `Expected contact with UID ${uid} to exist`);
        } else if (contact === undefined) {
            return undefined;
        }

        // Extract profile picture fields
        const profilePictureData: ContactProfilePictureFields = {
            colorIndex: contact.colorIndex,
            profilePictureContactDefined: contact.profilePictureContactDefined,
            profilePictureGatewayDefined: contact.profilePictureGatewayDefined,
            profilePictureUserDefined: contact.profilePictureUserDefined,
        };

        // Create a store
        return new ContactModelStore(services, addDerivedData(contact), uid, profilePictureData);
    });
}

function getByIdentity(
    services: ServicesForModel,
    identity: IdentityString,
): LocalModelStore<Contact> | undefined {
    const {db} = services;

    // Check if the contact exists, then return the store
    const uid = db.hasContactByIdentity(identity);
    if (uid === undefined) {
        return undefined;
    }
    return getByUid(services, uid, Existence.ENSURED);
}

function update(services: ServicesForModel, change: Exact<ContactUpdate>, uid: DbContactUid): void {
    const {db} = services;

    // Just a sanity-check to really ensure that the `change` does not include the public key to
    // mitigate payload confusion.
    assert(
        (change as unknown as Partial<Pick<ContactView, 'publicKey'>>).publicKey === undefined,
        'Expected existing contact to not update the public key',
    );

    // Update the contact
    db.updateContact({...change, uid});
}

function isRemovable(services: ServicesForModel, uid: DbContactUid): boolean {
    const {db} = services;
    const groupsWithContactAsMember = db.getAllActiveGroupUidsByMember(uid);
    return groupsWithContactAsMember.length === 0;
}

function remove(services: ServicesForModel, uid: DbContactUid): void {
    const {db} = services;

    // Remove the contact
    //
    // Note: This implicitly removes the associated conversation and all of its associated
    //       messages. The contact may not be part of any groups at this point.
    assert(isRemovable(services, uid), 'The contact may not be part of any groups at this point.');
    db.removeContact(uid);
    cache.remove(uid);
}

function all(services: ServicesForModel): LocalSetStore<LocalModelStore<Contact>> {
    return cache.setRef.derefOrCreate(() => {
        const {db, logging} = services;
        // Note: This may be inefficient. It would be more efficient to get all UIDs, then filter
        // out all UIDs we have cached stores for and then make an aggregated request for the
        // remaining ones.
        const stores = db
            .getAllContactUids()
            .map(({uid}) => getByUid(services, uid, Existence.ENSURED));
        const tag = `contact[]`;
        return new LocalSetStore(new Set(stores), {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    });
}

/** @inheritdoc */
export class ContactModelController implements ContactController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly notificationTag: NotificationTag;
    public readonly meta = new ModelLifetimeGuard<ContactView>();

    public readonly update: ContactController['update'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        fromLocal: async (change: ContactUpdate) => {
            this._log.debug('ContactModelController: Update from local');
            return await this._updateAsync({source: TriggerSource.LOCAL}, change);
        },
        fromRemote: async (handle, change: ContactUpdate) => {
            this._log.debug('ContactModelController: Update from remote');
            return await this._updateAsync({source: TriggerSource.REMOTE, handle}, change);
        },
        fromSync: (change: ContactUpdate) => {
            this._log.debug('ContactModelController: Update from sync');
            this._update(change);
        },
    };

    public readonly remove: ContactController['remove'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,

        fromLocal: async () => {
            const {taskManager} = this._services;

            await this._lock.with(async () => {
                // Precondition: Abort if the contact has already been removed (and consequently
                // disabled the contact's controller) or if the contact is still member of any
                // group.
                const precondition = (): boolean => this.meta.active && this._isRemovable();

                // Reflect contact removal to other devices inside a transaction
                const result = await taskManager.schedule(
                    new ReflectContactSyncTransactionTask(this._services, precondition, {
                        type: 'delete',
                        identity: this._identity,
                    }),
                );

                // Commit removal, if necessary
                switch (result) {
                    case 'success':
                        // Remove locally
                        this._remove();
                        break;
                    case 'aborted':
                        // Local contact already removed.
                        //
                        // Note: This can only happen because another device synchronized removal of this contact.
                        return;
                    default:
                        unreachable(result);
                }
            });
        },

        fromSync: () => this._remove(),
    };

    private readonly _lookup: DbContactReceiverLookup;
    private readonly _lock = new AsyncLock();
    private readonly _log: Logger;

    /**
     * A version counter that should be incremented for every contact update.
     */
    private readonly _version = new SequenceNumberU53<u53>(0);

    /**
     * Instantiate the ContactModelController.
     *
     * IMPORTANT: The caller must ensure that `uid` and `_identity` arguments both refer to the same
     *            contact, otherwise the behavior is undefined.
     */
    public constructor(
        private readonly _services: ServicesForModel,
        public readonly uid: DbContactUid,
        private readonly _identity: IdentityString,
        private readonly _profilePictureData: ContactProfilePictureFields,
    ) {
        this.notificationTag = getNotificationTagForContact(_identity);
        this._lookup = {
            type: ReceiverType.CONTACT,
            uid: this.uid,
        };
        this._log = this._services.logging.logger(`model.contact.${this.uid}`);
    }

    /** @inheritdoc */
    public profilePicture(): LocalModelStore<ProfilePicture> {
        return this.meta.run(() =>
            this._services.model.profilePictures.getForContact(
                this.uid,
                this._identity,
                this._profilePictureData,
            ),
        );
    }

    /** @inheritdoc */
    public conversation(): LocalModelStore<Conversation> {
        return this._conversation();
    }

    /** @inheritdoc */
    public isRemovable(): boolean {
        return isRemovable(this._services, this._lookup.uid);
    }

    /**
     * Locally update the contact and increment the version counter.
     */
    private _update(change: ContactUpdate): void {
        this.meta.update((contact) => {
            update(this._services, ensureExactContactUpdate(change), this.uid);
            this._version.next();
            return addDerivedData({...contact, ...change});
        });
    }

    private async _updateAsync(
        scope:
            | {source: TriggerSource.LOCAL}
            | {source: TriggerSource.REMOTE; handle: ActiveTaskCodecHandle<'volatile'>},
        change: ContactUpdate,
    ): Promise<void> {
        const {taskManager} = this._services;

        await this._lock.with(async () => {
            // Precondition: The contact was not updated in the meantime
            const currentVersion = this._version.current;
            const precondition = (): boolean =>
                this.meta.active && this._version.current === currentVersion;

            // Reflect contact to other devices inside a transaction
            const syncTask = new ReflectContactSyncTransactionTask(this._services, precondition, {
                type: 'update-contact-data',
                identity: this._identity,
                contact: change,
            });
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

            // Commit update, if possible
            switch (result) {
                case 'success':
                    // Update locally
                    this._update(change);
                    break;
                case 'aborted':
                    // Synchronization conflict
                    throw new Error('Failed to update contact due to synchronization conflict');
                default:
                    unreachable(result);
            }
        });
    }

    private _isRemovable(): boolean {
        if (isRemovable(this._services, this.uid)) {
            return true;
        }
        this._log.warn(`Unable to delete contact because it is still member of one or more groups`);
        return false;
    }

    /**
     * Locally remove the contact, deactivate and purge the conversation and all of its messages
     * from their respective caches, and remove the conversation and all of its messages in the
     * database. The contact may not be part of any groups at this point.
     */
    private _remove(): void {
        assert(this._isRemovable(), 'The contact may not be part of any groups at this point.');

        this.meta.deactivate(() => {
            // Deactivate and purge the conversation and all of its messages
            // from their respective caches
            conversation.deactivateAndPurgeCacheCascade(this._lookup, this.conversation());

            // Now, remove the contact. This implicitly removes the
            // conversation and all of its messages in the database.
            remove(this._services, this.uid);
        });
    }

    private _conversation(): ConversationModelStore {
        return this.meta.run(() =>
            conversation.getByReceiver(
                this._services,
                this._lookup,
                // Safe because the executor context ensures that the contact exists, therefore
                // an associated conversation must also exist.
                Existence.ENSURED,
                this._identity,
            ),
        );
    }
}

/** @inheritdoc */
export class ContactModelStore extends LocalModelStore<Contact> {
    /**
     * Instantiate the ContactModelStore.
     *
     * IMPORTANT: The caller must ensure that `contact` and `uid` arguments both refer to the same
     *            contact, otherwise the behavior is undefined.
     */
    public constructor(
        services: ServicesForModel,
        contact: ContactView,
        uid: DbContactUid,
        profilePictureData: ContactProfilePictureFields,
    ) {
        const {logging} = services;
        const tag = `contact.${contact.identity}`;
        super(
            contact,
            new ContactModelController(services, uid, contact.identity, profilePictureData),
            uid,
            ReceiverType.CONTACT,
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
export class ContactModelRepository implements ContactRepository {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    /** @inheritdoc */
    public readonly add: ContactRepository['add'] = {
        [TRANSFER_MARKER]: PROXY_HANDLER,

        fromLocal: async (init: ContactInit) => {
            this._log.debug('ContactModelRepository: Add from local');
            return await this._addAsync({source: TriggerSource.LOCAL}, init);
        },

        fromRemote: async (handle, init: ContactInit) => {
            this._log.debug('ContactModelRepository: Add from remote');
            return await this._addAsync({source: TriggerSource.REMOTE, handle}, init);
        },

        fromSync: (init: ContactInit) => {
            this._log.debug('ContactModelRepository: Add from sync');
            this._assertNotOwnIdentity(init);
            return create(this._services, ensureExactContactInit(init));
        },
    };

    private readonly _lock = new AsyncLock();
    private readonly _log: Logger;

    public constructor(private readonly _services: ServicesForModel) {
        this._log = _services.logging.logger('model.contact.contacts-model');

        // TODO(WEBMD-697): This is a quick workaround to make test/mocha/common/model/contact.spec.ts work,
        // but should be probably a private class attribute (not a trivial change as of now), or maybe be
        // moved down to DB level. This case was the origin of WEBMD-697.
        this._log.info('Creating new cache...');
        cache = new LocalModelStoreCache<DbContactUid, LocalModelStore<Contact>>();
    }

    /** @inheritdoc */
    public getByUid(uid: DbContactUid): LocalModelStore<Contact> | undefined {
        return getByUid(this._services, uid, Existence.UNKNOWN);
    }

    /** @inheritdoc */
    public getByIdentity(identity: IdentityString): LocalModelStore<Contact> | undefined {
        return getByIdentity(this._services, identity);
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<LocalModelStore<Contact>> {
        return all(this._services);
    }

    /** @inheritdoc */
    public remove(uid: DbContactUid): void {
        return remove(this._services, uid);
    }

    private _assertNotOwnIdentity(init: ContactInit): void {
        if (init.identity === this._services.device.identity.string) {
            throw new Error('The user cannot add themself as contact.');
        }
    }

    private async _addAsync(
        scope:
            | {source: TriggerSource.LOCAL}
            | {source: TriggerSource.REMOTE; handle: ActiveTaskCodecHandle<'volatile'>},
        init: ContactInit,
    ): Promise<LocalModelStore<Contact>> {
        const {taskManager} = this._services;
        this._assertNotOwnIdentity(init);

        return await this._lock.with(async () => {
            // Precondition: The contact does not exist
            const precondition = (): boolean =>
                getByIdentity(this._services, init.identity) === undefined;

            // Reflect contact to other devices inside a transaction
            this._log.debug(`Syncing contact ${init.identity} to other devices`);
            const syncTask = new ReflectContactSyncTransactionTask(this._services, precondition, {
                type: 'create',
                contact: init,
            });
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

            // Commit creation, if necessary
            switch (result) {
                case 'success':
                    // Create locally
                    return create(this._services, ensureExactContactInit(init));
                case 'aborted':
                    // Local contact already exists.
                    //
                    // Note: This can only happen because another device synchronized creation of this contact.
                    return unwrap(getByIdentity(this._services, init.identity));
                default:
                    return unreachable(result);
            }
        });
    }
}

/**
 * Determine the display name of the contact.
 */
export function getDisplayName(
    contact: Pick<ContactView, 'firstName' | 'lastName' | 'nickname' | 'identity'>,
): string {
    if (contact.firstName !== '' && contact.lastName !== '') {
        return `${contact.firstName} ${contact.lastName}`;
    } else if (contact.firstName !== '') {
        return contact.firstName;
    } else if (contact.lastName !== '') {
        return contact.lastName;
    } else if (contact.nickname !== '') {
        return `~${contact.nickname}`;
    }
    return contact.identity;
}

/**
 * Determine the initials of the contact.
 */
export function getInitials(
    contact: Pick<ContactView, 'firstName' | 'lastName' | 'nickname' | 'identity'>,
): string {
    if (contact.firstName !== '' && contact.lastName !== '') {
        return `${getGraphemeClusters(contact.firstName).join('')}${getGraphemeClusters(
            contact.lastName,
        ).join('')}`;
    } else if (contact.firstName !== '') {
        return getGraphemeClusters(contact.firstName, 2).join('');
    } else if (contact.lastName !== '') {
        return getGraphemeClusters(contact.lastName, 2).join('');
    } else if (contact.nickname !== '') {
        return getGraphemeClusters(contact.nickname, 2).join('');
    }
    return contact.identity.substring(0, 2);
}

export function getFullName(contact: {firstName: string; lastName: string}): string {
    return `${contact.firstName} ${contact.lastName}`.trim();
}
