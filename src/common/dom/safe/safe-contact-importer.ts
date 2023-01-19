import {type ServicesForBackend} from '~/common/backend';
import {type PublicKey, ensurePublicKey} from '~/common/crypto';
import {type SafeBackupData, type SafeContact} from '~/common/dom/safe';
import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    FeatureMaskFlag,
    IdentityType,
    ReceiverType,
    SyncState,
    VerificationLevelUtils,
    WorkVerificationLevel,
} from '~/common/enum';
import {type ContactInit} from '~/common/model';
import {
    type IdentityData,
    type InvalidIdentityData,
    type ValidIdentityData,
} from '~/common/network/protocol/directory';
import {ensureFeatureMask, ensureIdentityString} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {base64ToU8a, u8aToBase64} from '~/common/utils/base64';
import {idColorIndex} from '~/common/utils/id-color';

/**
 * Imports all {@link SafeContact}s in a {@link SafeBackupData} and saves them to the database.
 */
export class SafeContactImporter {
    private readonly _log;
    private readonly _model;
    private readonly _directory;

    public constructor(services: Pick<ServicesForBackend, 'logging' | 'model' | 'directory'>) {
        this._log = services.logging.logger('backend.safe-contact-importer');
        this._model = services.model;
        this._directory = services.directory;
    }

    /**
     * Import all contacts in a {@link SafeBackupData} and save them to the database.
     *
     * @param backupData where the contacts will be imported from.
     */
    public async importFrom(backupData: SafeBackupData): Promise<void> {
        this._log.info(`Importing ${backupData.contacts.length} contacts from backup`);
        if (backupData.contacts.length > 0) {
            await this._importContacts(backupData.contacts);
        }
    }

    private async _importContacts(contacts: readonly SafeContact[]): Promise<void> {
        const identities = await this._directory.identities(
            contacts.map((contact) => contact.identity),
        );
        for (const contact of contacts) {
            const identityData = identities[contact.identity];
            assert(identityData !== undefined, `Identity data for ${contact.identity} not found`);
            this._importContact(contact, identityData);
        }
    }

    private _importContact(contact: SafeContact, identityData: IdentityData): void {
        this._log.debug(`Importing contact ${contact.identity}`, {contact});
        let imported: boolean;
        switch (identityData.state) {
            case ActivityState.INVALID:
                imported = this._importInvalidContact(identityData, contact);
                break;

            case ActivityState.ACTIVE:
            case ActivityState.INACTIVE:
                imported = this._importValidContact(identityData, contact);
                break;

            default:
                unreachable(identityData);
        }
        if (imported) {
            this._log.info(`Contact ${contact.identity} successfully imported`);
        } else {
            this._log.warn(`Contact ${contact.identity} could not be imported`);
        }
    }

    /**
     * Import contact with {@link ActivityState.INVALID}, return whether contact could be imported.
     */
    private _importInvalidContact(
        identityData: InvalidIdentityData,
        contact: SafeContact,
    ): boolean {
        if (contact.publickey === undefined) {
            this._log.warn('Skipping INVALID contact as public key is missing in backup data');
            return false;
        }
        this._model.contacts.add.fromSync({
            ...this._propertiesFromSafeContact(contact),
            activityState: identityData.state,
            publicKey: ensurePublicKey(base64ToU8a(contact.publickey)),
            identityType: IdentityType.REGULAR, // Cannot be known anymore at this stage, so defaulting to IdentityType.REGULAR.
            featureMask: ensureFeatureMask(FeatureMaskFlag.NONE),
        });
        return true;
    }

    /**
     * Import contact with {@link ActivityState.ACTIVE} or {@link ActivityState.INACTIVE}, return
     * whether contact could be imported.
     */
    private _importValidContact(identityData: ValidIdentityData, contact: SafeContact): boolean {
        let verifiedPublicKey;
        try {
            verifiedPublicKey = this._publicKey(identityData, contact);
        } catch (error) {
            this._log.error(`Skipping contact due to error: ${error}`);
            return false;
        }
        this._model.contacts.add.fromSync({
            ...this._propertiesFromSafeContact(contact),
            activityState: identityData.state,
            publicKey: verifiedPublicKey,
            identityType: identityData.type,
            featureMask: identityData.featureMask,
        });
        return true;
    }

    private _propertiesFromSafeContact(
        contact: SafeContact,
    ): Omit<ContactInit, 'activityState' | 'publicKey' | 'identityType' | 'featureMask'> {
        const identity = ensureIdentityString(contact.identity);
        return {
            identity,
            createdAt: this._creationDate(contact),
            lastUpdate: this._lastUpdateDate(contact),
            firstName: contact.firstname,
            lastName: contact.lastname,
            nickname: contact.nickname,
            colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity}),
            verificationLevel: VerificationLevelUtils.fromNumber(contact.verification),
            workVerificationLevel: this._workVerificationLevel(contact),
            acquaintanceLevel: this._acquaintanceLevel(contact),
            syncState: this._syncState(contact),
            category: this._conversationCategory(contact),
            visibility: ConversationVisibility.SHOW,
        };
    }

    private _creationDate(contact: SafeContact): Date {
        return contact.createdAt === undefined ? new Date() : new Date(contact.createdAt);
    }

    private _lastUpdateDate(contact: SafeContact): Date | undefined {
        return contact.lastUpdate === undefined ? undefined : new Date(contact.lastUpdate);
    }

    private _workVerificationLevel(contact: SafeContact): WorkVerificationLevel {
        return contact.workVerified === true
            ? WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED
            : WorkVerificationLevel.NONE;
    }

    private _acquaintanceLevel(contact: SafeContact): AcquaintanceLevel {
        return contact.hidden ? AcquaintanceLevel.GROUP : AcquaintanceLevel.DIRECT;
    }

    private _syncState(contact: SafeContact): SyncState {
        if (contact.firstname === '' && contact.lastname === '') {
            // Allow updating names by contact sync
            return SyncState.INITIAL;
        }
        // Prevent overwriting by contact sync
        return SyncState.CUSTOM;
    }

    private _conversationCategory(contact: SafeContact): ConversationCategory {
        return contact.private ? ConversationCategory.PROTECTED : ConversationCategory.DEFAULT;
    }

    private _publicKey(identityData: ValidIdentityData, contact: SafeContact): PublicKey {
        const publicKeyFromBackup = contact.publickey;
        const publicKeyFetchedFromDirectory = identityData.publicKey;
        if (publicKeyFromBackup === undefined) {
            this._log.debug(
                `Public key for ${contact.identity} missing from safe backup. Using public key from directory.`,
            );
        } else {
            this._assertPublicKeysMatch(publicKeyFromBackup, publicKeyFetchedFromDirectory);
        }
        return publicKeyFetchedFromDirectory;
    }

    /**
     * Ensure that the public key from a Safe backup matches the public key fetched from the
     * directory server.
     *
     * In the design of Threema, the public key of an identity may never change. If a mismatch is
     * detected, it can have two reasons:
     *
     * - The backup might be corrupted
     * - The directory server might lie about the public key, or a MITM might have happened
     *
     * Both cases would be critical and should prevent a contact from being imported. Thus we throw
     * an error.
     */
    private _assertPublicKeysMatch(fromBackup: string, fromDirectoryAsBytes: PublicKey): void {
        const fromDirectory = u8aToBase64(fromDirectoryAsBytes);
        if (fromBackup !== fromDirectory) {
            // TODO(WEBMD-427): Decide how to handle this case and how it affects the UX.
            throw new Error(
                `Public key mismatch! backup=${fromBackup}, directory=${fromDirectory}`,
            );
        }
    }
}
