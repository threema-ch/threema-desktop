import type {
    DbContact,
    DbContactReceiverLookup,
    DbContactUid,
    DbCreate,
    DbCreateConversationMixin,
} from '~/common/db';
import type {Device} from '~/common/device';
import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    Existence,
    IdentityType,
    ReceiverType,
    SyncState,
    TriggerSource,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {ConversationModelStore} from '~/common/model/conversation';
import * as conversation from '~/common/model/conversation';
import type {ContactProfilePictureFields} from '~/common/model/profile-picture';
import type {ServicesForModel} from '~/common/model/types/common';
import {
    PREDEFINED_CONTACTS,
    type Contact,
    type ContactController,
    type ContactInit,
    type ContactRepository,
    type ContactUpdate,
    type ContactView,
    type ContactViewDerivedProperties,
    type PredefinedContactIdentity,
    isPredefinedContact,
} from '~/common/model/types/contact';
import type {Conversation} from '~/common/model/types/conversation';
import type {ProfilePicture} from '~/common/model/types/profile-picture';
import {ModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {IdentityData} from '~/common/network/protocol/directory';
import type {ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {ReflectContactSyncTransactionTask} from '~/common/network/protocol/task/d2d/reflect-contact-sync-transaction';
import type {IdentityString} from '~/common/network/types';
import {getNotificationTagForContact, type NotificationTag} from '~/common/notification';
import type {StrictOmit, u53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {byteEquals} from '~/common/utils/byte';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {idColorIndex, idColorIndexToString} from '~/common/utils/id-color';
import {AsyncLock} from '~/common/utils/lock';
import {
    createExactPropertyValidator,
    type Exact,
    OPTIONAL,
    REQUIRED,
} from '~/common/utils/property-validator';
import {SequenceNumberU53} from '~/common/utils/sequence-number';
import {LocalSetStore} from '~/common/utils/store/set-store';
import {getGraphemeClusters} from '~/common/utils/string';

/**
 * Retrieve the {@link IdentityString} for a {@link ModelStore<Contact> | 'me'}.
 */
export function getIdentityString(
    device: Device,
    contact: ModelStore<Contact> | 'me',
): IdentityString {
    if (contact === 'me') {
        return device.identity.string;
    }
    return contact.get().view.identity;
}

let cache = new ModelStoreCache<DbContactUid, ModelStore<Contact>>();

const ensureExactContactInit = createExactPropertyValidator<ContactInit>('ContactInit', {
    identity: REQUIRED,
    publicKey: REQUIRED,
    createdAt: REQUIRED,
    firstName: REQUIRED,
    lastName: REQUIRED,
    nickname: OPTIONAL,
    colorIndex: REQUIRED,
    verificationLevel: REQUIRED,
    workVerificationLevel: REQUIRED,
    identityType: REQUIRED,
    acquaintanceLevel: REQUIRED,
    activityState: REQUIRED,
    featureMask: REQUIRED,
    syncState: REQUIRED,
    typingIndicatorPolicyOverride: OPTIONAL,
    readReceiptPolicyOverride: OPTIONAL,
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
    typingIndicatorPolicyOverride: OPTIONAL,
    readReceiptPolicyOverride: OPTIONAL,
    notificationTriggerPolicyOverride: OPTIONAL,
    notificationSoundPolicyOverride: OPTIONAL,
});

function addDerivedData(
    contact: StrictOmit<ContactView, ContactViewDerivedProperties>,
): ContactView {
    return {
        ...contact,
        displayName: getDisplayName(contact),
        initials: getContactInitials(contact),
        color: idColorIndexToString(contact.colorIndex),
    };
}

function create(services: ServicesForModel, init: Exact<ContactInit>): ModelStore<Contact> {
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
        nickname: init.nickname,
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
        () => new ContactModelStore(services, addDerivedData(init), uid, profilePictureData),
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
): TExistence extends Existence.ENSURED ? ModelStore<Contact> : ModelStore<Contact> | undefined;

/**
 * Fetch a contact model by its database UID.
 *
 * Note: Assumes that the database entry exists!
 */
export function getByUid(
    services: ServicesForModel,
    uid: DbContactUid,
    existence: Existence,
): ModelStore<Contact> | undefined {
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
        return new ContactModelStore(
            services,
            addDerivedData({
                ...contact,
                nickname: contact.nickname,
            }),
            uid,
            profilePictureData,
        );
    });
}

function getByIdentity(
    services: ServicesForModel,
    identity: IdentityString,
): ModelStore<Contact> | undefined {
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
    const groupsWithContactAsMember = db.getAllCommonGroupsByContact(uid);
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

function all(services: ServicesForModel): LocalSetStore<ModelStore<Contact>> {
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
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly notificationTag: NotificationTag;
    public readonly lifetimeGuard = new ModelLifetimeGuard<ContactView>();

    public readonly profilePicture: ModelStore<ProfilePicture>;

    public readonly update: ContactController['update'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        fromLocal: async (change: ContactUpdate) => {
            this._log.debug('ContactModelController: Update from local');

            // When editing a contact with acquaintance level GROUP, we want the contact to be
            // visible in the contact list, so we change the acquaintance level to DIRECT.
            const currentAcquaintanceLevel = this.lifetimeGuard.run(
                (contactStoreHandle) => contactStoreHandle.view().acquaintanceLevel,
            );
            if (currentAcquaintanceLevel === AcquaintanceLevel.GROUP) {
                change = {acquaintanceLevel: AcquaintanceLevel.DIRECT, ...change};
            }

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
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async () => {
            const {taskManager} = this._services;

            await this._lock.with(async () => {
                // Precondition: Abort if the contact has already been removed (and consequently
                // disabled the contact's controller) or if the contact is still member of any
                // group.
                const precondition = (): boolean =>
                    this.lifetimeGuard.active.get() && this._isRemovable();

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
    private readonly _versionSequence = new SequenceNumberU53<u53>(0);

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
        initialProfilePictureData: ContactProfilePictureFields,
    ) {
        this.notificationTag = getNotificationTagForContact(_identity);
        this._lookup = {
            type: ReceiverType.CONTACT,
            uid: this.uid,
        };
        this._log = this._services.logging.logger(`model.contact.${this.uid}`);
        this.profilePicture = this._services.model.profilePictures.getForContact(
            this.uid,
            this._identity,
            initialProfilePictureData,
        );
    }

    /** @inheritdoc */
    public conversation(): ModelStore<Conversation> {
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
        this.lifetimeGuard.update((contact) => {
            update(this._services, ensureExactContactUpdate(change), this.uid);
            this._versionSequence.next();
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
            const currentVersion = this._versionSequence.current;
            const precondition = (): boolean =>
                this.lifetimeGuard.active.get() && this._versionSequence.current === currentVersion;

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

        this.lifetimeGuard.deactivate(() => {
            // Deactivate and purge the conversation and all of its messages
            // from their respective caches
            conversation.deactivateAndPurgeCacheCascade(this._lookup, this.conversation());

            // Now, remove the contact. This implicitly removes the
            // conversation and all of its messages in the database.
            remove(this._services, this.uid);
        });
    }

    private _conversation(): ConversationModelStore {
        return this.lifetimeGuard.run(() =>
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
export class ContactModelStore extends ModelStore<Contact> {
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
        initialProfilePictureData: ContactProfilePictureFields,
    ) {
        const {logging} = services;
        const tag = `contact.${uid}`;
        super(
            contact,
            new ContactModelController(services, uid, contact.identity, initialProfilePictureData),
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
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    /** @inheritdoc */
    public readonly add: ContactRepository['add'] = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,

        fromLocal: async (init: ContactInit) => {
            this._log.debug('ContactModelRepository: Add from local');

            // Detect predefined contacts
            let contactInit = init;
            const identity: string = init.identity;
            if (isPredefinedContact(identity)) {
                this._log.debug(
                    'ContactModelRepository: Detected predefined contact, overriding public key and verification level',
                );
                contactInit = {
                    ...init,
                    firstName:
                        init.firstName === '' && init.lastName === ''
                            ? PREDEFINED_CONTACTS[identity].name
                            : init.firstName,
                    publicKey: PREDEFINED_CONTACTS[identity].publicKey,
                    verificationLevel: VerificationLevel.FULLY_VERIFIED,
                };
            }

            return await this._addAsync({source: TriggerSource.LOCAL}, contactInit);
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
        this._log = _services.logging.logger('model.contact-repository');

        // TODO(DESK-697): This is a quick workaround to make test/mocha/common/model/contact.spec.ts work,
        // but should be probably a private class attribute (not a trivial change as of now), or maybe be
        // moved down to DB level. This case was the origin of DESK-697.
        this._log.debug('Creating new cache');
        cache = new ModelStoreCache<DbContactUid, ModelStore<Contact>>();
    }

    /** @inheritdoc */
    public getByUid(uid: DbContactUid): ModelStore<Contact> | undefined {
        return getByUid(this._services, uid, Existence.UNKNOWN);
    }

    /** @inheritdoc */
    public getByIdentity(identity: IdentityString): ModelStore<Contact> | undefined {
        return getByIdentity(this._services, identity);
    }

    // Should we only allow programatic default add for a specific subset of IDs (e.g *SUPPORT)?
    public async getOrCreatePredefinedContact(
        identity: PredefinedContactIdentity,
    ): Promise<ModelStore<Contact>> {
        const contact = this.getByIdentity(identity as IdentityString);
        if (contact !== undefined) {
            return contact;
        }
        const contactInit = await this._createPredefinedContactInit(identity);
        if (contactInit === undefined) {
            throw new Error('The user tried to add an invalid ID');
        }
        return await this.add.fromLocal(contactInit);
    }

    /** @inheritdoc */
    public getAll(): LocalSetStore<ModelStore<Contact>> {
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

    private async _createPredefinedContactInit(
        identity: PredefinedContactIdentity,
    ): Promise<ContactInit | undefined> {
        const identityString = identity as IdentityString;

        const identityData: IdentityData = await this._services.directory.identity(identityString);
        if (identityData.state === ActivityState.INVALID) {
            return undefined;
        }

        const predefinedContact = PREDEFINED_CONTACTS[identity];
        const contactInit: ContactInit = {
            identity: identityString,
            publicKey: predefinedContact.publicKey,
            firstName: predefinedContact.name,
            lastName: '',
            nickname: undefined,
            colorIndex: idColorIndex({
                type: ReceiverType.CONTACT,
                identity: identityString,
            }),
            createdAt: new Date(),
            verificationLevel: VerificationLevel.FULLY_VERIFIED,
            workVerificationLevel: WorkVerificationLevel.NONE,
            identityType: IdentityType.REGULAR,
            // Note: Semantics of "AcquaintanceLevel.GROUP" are not quite correct, but since the
            // behavior should be exactly the same as for group contacts, this should be fine for
            // now.
            acquaintanceLevel: predefinedContact.visibleInContactList
                ? AcquaintanceLevel.DIRECT
                : AcquaintanceLevel.GROUP,
            featureMask: identityData.featureMask,
            syncState: SyncState.INITIAL,
            activityState: identityData.state ?? ActivityState.ACTIVE,
            category: ConversationCategory.DEFAULT,
            visibility: ConversationVisibility.SHOW,
        };
        return contactInit;
    }

    private async _addAsync(
        scope:
            | {source: TriggerSource.LOCAL}
            | {source: TriggerSource.REMOTE; handle: ActiveTaskCodecHandle<'volatile'>},
        init: ContactInit,
    ): Promise<ModelStore<Contact>> {
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
                    //
                    // TODO(DESK-1001): Do we need to update the contact here?
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
    } else if (contact.nickname !== undefined) {
        return `~${contact.nickname}`;
    }
    return contact.identity;
}

/**
 * Determine the initials of the contact.
 */
export function getContactInitials(
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
    } else if (contact.nickname !== undefined) {
        return getGraphemeClusters(contact.nickname, 2).join('');
    }
    return contact.identity.substring(0, 2);
}

export function getFullName(contact: {firstName: string; lastName: string}): string {
    return `${contact.firstName} ${contact.lastName}`.trim();
}
