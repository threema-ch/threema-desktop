import type {PublicKey} from '~/common/crypto';
import type {DbContactUid} from '~/common/db';
import {
    AcquaintanceLevel,
    type ActivityState,
    type ContactNotificationTriggerPolicy,
    type NotificationSoundPolicy,
    type ReadReceiptPolicy,
    type TypingIndicatorPolicy,
    VerificationLevel as NumericVerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import type {Contact, ContactView, ProfilePicture} from '~/common/model';
import {getDisplayName} from '~/common/model/contact';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {IdentityString, Nickname} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, type LocalSetStore} from '~/common/utils/store/set-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ReceiverBadgeType} from '~/common/viewmodel/types';
import {getContactBadge} from '~/common/viewmodel/utils/contact';

/**
 * TODO(DESK-709): Type from svelte-components, get rid of this.
 */
export type VerificationLevelColors = 'default' | 'shared-work-subscription';

/**
 * TODO(DESK-709): Type from svelte-components, get rid of this.
 */
export type VerificationLevel = 'unverified' | 'server-verified' | 'fully-verified';

export type ContactListItemSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Contact>>,
    ContactListItemSetEntry
>;

export interface ContactListItemSetEntry extends PropertiesMarked {
    readonly contactUid: DbContactUid;
    // TODO(DESK-706): Pass in the ContactController, not the model store
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
    const contactModelStore = model.contacts.getByUid(uid);
    if (contactModelStore === undefined) {
        return undefined;
    }

    return derive([contactModelStore], ([{currentValue: contactModel, store}]) =>
        endpoint.exposeProperties({
            contactUid: contactModel.ctx,
            contactModelStore: store,
            viewModelStore: getViewModelStore(services, store),
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
    readonly nickname: Nickname | undefined;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly displayName: string;
    readonly initials: string;
    readonly profilePicture: LocalModelStore<ProfilePicture>;
    readonly badge: ReceiverBadgeType | undefined;
    readonly isNew: boolean;
    readonly verificationLevel: VerificationLevel;
    readonly verificationLevelColors: VerificationLevelColors;
    readonly showInContactList: boolean;
    readonly activityState: ActivityState;
    readonly isBlocked: boolean;
    readonly readReceiptPolicyOverride: ReadReceiptPolicy | undefined;
    readonly typingIndicatorPolicyOverride: TypingIndicatorPolicy | undefined;
    readonly notificationTriggerPolicyOverride:
        | {
              readonly policy: ContactNotificationTriggerPolicy;
              readonly expiresAt?: Date;
          }
        | undefined;
    readonly notificationSoundPolicyOverride: NotificationSoundPolicy | undefined;
}

/**
 * Get the derived view model store for the specified {@link contactModelStore}.
 */
function getViewModelStore(
    services: ServicesForViewModel,
    contactModelStore: LocalModelStore<Contact>,
): ContactListItemViewModelStore {
    const {endpoint, model} = services;

    return derive([contactModelStore], ([{currentValue: contactModel}], getAndSubscribe) =>
        endpoint.exposeProperties({
            uid: contactModel.ctx,
            identity: contactModel.view.identity,
            publicKey: contactModel.view.publicKey,
            nickname: contactModel.view.nickname,
            firstName: contactModel.view.firstName,
            lastName: contactModel.view.lastName,
            fullName: getFullName(contactModel.view),
            displayName: getDisplayName(contactModel.view),
            initials: contactModel.view.initials,
            profilePicture: contactModel.controller.profilePicture,
            badge: getContactBadge(contactModel.view),
            // TODO(DESK-381): Determine whether contact is a new contact
            isNew: Math.random() < 0.5,
            ...transformContactVerificationLevel(contactModel.view),
            showInContactList: contactModel.view.acquaintanceLevel !== AcquaintanceLevel.GROUP,
            activityState: contactModel.view.activityState,
            isBlocked: getAndSubscribe(
                model.user.privacySettings,
            ).controller.isIdentityExplicitlyBlocked(contactModel.view.identity),
            readReceiptPolicyOverride: contactModel.view.readReceiptPolicyOverride,
            typingIndicatorPolicyOverride: contactModel.view.typingIndicatorPolicyOverride,
            notificationTriggerPolicyOverride: contactModel.view.notificationTriggerPolicyOverride,
            notificationSoundPolicyOverride: contactModel.view.notificationSoundPolicyOverride,
        }),
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
