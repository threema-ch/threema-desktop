import {type PublicKey} from '~/common/crypto';
import {type DbContactUid} from '~/common/db';
import {
    AcquaintanceLevel,
    type ActivityState,
    IdentityType,
    VerificationLevel as NumericVerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {type Contact, type ContactView, type ProfilePicture} from '~/common/model';
import {getDisplayName} from '~/common/model/contact';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type IdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, type LocalSetStore} from '~/common/utils/store/set-store';
import {type ServicesForViewModel} from '~/common/viewmodel';

/**
 * TODO(WEBMD-709): Type from svelte-components, get rid of this.
 */
export type VerificationLevelColors = 'default' | 'shared-work-subscription';

/**
 * TODO(WEBMD-709): Type from svelte-components, get rid of this.
 */
export type VerificationLevel = 'unverified' | 'server-verified' | 'fully-verified';

/**
 * TODO(WEBMD-709): Type from svelte-components, get rid of this.
 */
export type ContactBadge = 'contact-consumer' | 'contact-work';

export type ContactListItemSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Contact>>,
    ContactListItemSetEntry
>;

export interface ContactListItemSetEntry extends PropertiesMarked {
    readonly contactUid: DbContactUid;
    // TODO(WEBMD-706): Pass in the ContactController, not the model store
    readonly contactModelStore: LocalModelStore<Contact>;
    readonly viewModelStore: ContactListItemViewModelStore;
}

/**
 * Get a set store that contains a {@link ContactListItemViewModel} for every existing contact.
 */
export function getContactListItemSetStore(
    services: ServicesForViewModel,
): ContactListItemSetStore {
    const {endpoint, model} = services;
    const contactSetStore = model.contacts.getAll();
    return new LocalDerivedSetStore(contactSetStore, (contactStore) =>
        endpoint.exposeProperties({
            contactUid: contactStore.ctx,
            contactModelStore: contactStore,
            viewModelStore: getViewModelStore(services, contactStore),
        }),
    );
}

/**
 * Get a store that contains a {@link ContactListItemSetEntry} for the given contact.
 */
export function getContactListItemStore(
    services: ServicesForViewModel,
    uid: DbContactUid,
): LocalStore<ContactListItemSetEntry> | undefined {
    const {endpoint, model} = services;
    const contactStore = model.contacts.getByUid(uid);
    if (contactStore === undefined) {
        return undefined;
    }
    return derive(contactStore, (contact) =>
        endpoint.exposeProperties({
            contactUid: contact.ctx,
            contactModelStore: contactStore,
            viewModelStore: getViewModelStore(services, contactStore),
        }),
    );
}

export type ContactListItemViewModelStore = LocalStore<ContactListItemViewModel>;

/**
 * View model for a row in the contact list.
 */
export interface ContactListItemViewModel extends PropertiesMarked {
    readonly uid: DbContactUid;
    readonly identity: IdentityString;
    readonly publicKey: PublicKey;
    readonly nickname: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly displayName: string;
    readonly initials: string;
    readonly profilePicture: LocalModelStore<ProfilePicture>;
    readonly badge: ContactBadge | undefined;
    readonly isNew: boolean;
    readonly verificationLevel: VerificationLevel;
    readonly verificationLevelColors: VerificationLevelColors;
    readonly showInContactList: boolean;
    readonly activityState: ActivityState;
    readonly blocked: boolean;
}

/**
 * Get the derived view model store for the specified {@link contactStore}.
 */
function getViewModelStore(
    services: ServicesForViewModel,
    contactStore: LocalModelStore<Contact>,
): ContactListItemViewModelStore {
    const {endpoint, model} = services;
    return derive(contactStore, (contact, getAndSubscribe) =>
        endpoint.exposeProperties({
            uid: contact.ctx,
            identity: contact.view.identity,
            publicKey: contact.view.publicKey,
            nickname: contact.view.nickname,
            firstName: contact.view.firstName,
            lastName: contact.view.lastName,
            fullName: getFullName(contact.view),
            displayName: getDisplayName(contact.view),
            initials: contact.view.initials,
            profilePicture: contact.controller.profilePicture,
            badge: transformContactBadge(contact.view),
            // TODO(WEBMD-381): Determine whether contact is a new contact
            isNew: Math.random() < 0.5,
            ...transformContactVerificationLevel(contact.view),
            showInContactList: contact.view.acquaintanceLevel !== AcquaintanceLevel.GROUP,
            activityState: contact.view.activityState,
            blocked: model.settings.contactIsBlocked(contact.view.identity),
        } as const),
    );
}

/**
 * Return the transformed verification level and color information.
 */
function transformContactVerificationLevel(
    contact: ContactView,
): Pick<ContactListItemViewModel, 'verificationLevel' | 'verificationLevelColors'> {
    // Determine verification level
    let verificationLevel: ContactListItemViewModel['verificationLevel'];
    switch (contact.verificationLevel) {
        case NumericVerificationLevel.UNVERIFIED:
            verificationLevel = 'unverified';
            break;
        case NumericVerificationLevel.SERVER_VERIFIED:
            verificationLevel = 'server-verified';
            break;
        case NumericVerificationLevel.FULLY_VERIFIED:
            verificationLevel = 'fully-verified';
            break;
        default:
            unreachable(contact.verificationLevel);
    }

    // Determine verification level colors
    let verificationLevelColors: ContactListItemViewModel['verificationLevelColors'];
    switch (contact.workVerificationLevel) {
        case WorkVerificationLevel.NONE:
            verificationLevelColors = 'default';
            break;
        case WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED:
            verificationLevelColors = 'shared-work-subscription';
            break;
        default:
            unreachable(contact.workVerificationLevel);
    }

    return {verificationLevel, verificationLevelColors};
}

function getFullName(contact: Pick<ContactView, 'firstName' | 'lastName'>): string {
    return `${contact.firstName} ${contact.lastName}`.trim();
}

/**
 * Determine badge type.
 *
 * Note: We only display contact badges when the identity type differs from our own identity
 *       type (i.e. the build variant).
 */
function transformContactBadge(
    contact: Pick<ContactView, 'identityType'>,
): ContactBadge | undefined {
    switch (contact.identityType) {
        case IdentityType.REGULAR:
            return import.meta.env.BUILD_VARIANT !== 'consumer' ? 'contact-consumer' : undefined;
        case IdentityType.WORK:
            return import.meta.env.BUILD_VARIANT !== 'work' ? 'contact-work' : undefined;
        default:
            return unreachable(contact.identityType);
    }
}
