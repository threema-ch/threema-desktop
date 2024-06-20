import type {ServicesForBackend} from '~/common/backend';
import {IdentityType, WorkVerificationLevel} from '~/common/enum';
import type {ContactView} from '~/common/model';
import {getDisplayName} from '~/common/model/contact';
import type {IdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ReceiverBadgeType} from '~/common/viewmodel/types';

/** Acontact that has been removed from the contact list of the user. */
export interface ContactRemoved {
    /**
     * Unique key across all receivers for keyed-each.
     *
     * WARNING: This will crash keyed-each usages when a sender can appear multiple times in a
     * list!
     */
    readonly id: string;
    readonly type: 'contact-removed';
    readonly identity: IdentityString;
    readonly name: string;
}

/**
 * Get the display name for a contact that may or may not exist in the user's contact list.
 */
export function getContactDisplayName(
    services: Pick<ServicesForBackend, 'model'>,
    contactOrIdentity: IdentityString,
    getAndSubscribe: GetAndSubscribeFunction,
): string {
    const contact = services.model.contacts.getByIdentity(contactOrIdentity);
    if (contact === undefined) {
        return getDisplayName({
            firstName: '',
            lastName: '',
            nickname: undefined,
            identity: contactOrIdentity,
        });
    }
    return getAndSubscribe(contact).view.displayName;
}

/**
 * Get the {@link ContactRemoved} data for a contact that no longer exists in the user's contact
 * list.
 *
 * Note: The caller must check that the provided contact does not exist in the user's contact list
 * before calling this.
 */
export function getRemovedContactData(identity: IdentityString): ContactRemoved {
    return {
        id: `contact-removed.${identity}`,
        type: 'contact-removed',
        identity,
        name: getDisplayName({
            firstName: '',
            lastName: '',
            nickname: undefined,
            identity,
        }),
    };
}

/**
 * Determine badge type.
 *
 * Note: We only display contact badges when the identity type differs from our own identity
 *       type (i.e. the build variant).
 */
export function getContactBadge(
    contact: Pick<ContactView, 'identityType' | 'workVerificationLevel'>,
): Extract<ReceiverBadgeType, 'contact-consumer' | 'contact-work'> | undefined {
    switch (import.meta.env.BUILD_VARIANT) {
        case 'consumer':
            return contact.identityType === IdentityType.WORK ? 'contact-work' : undefined;

        case 'work':
            // If the contact is in the same subscription, never display a badge
            if (
                contact.workVerificationLevel === WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED
            ) {
                return undefined;
            }

            return contact.identityType === IdentityType.REGULAR ? 'contact-consumer' : undefined;

        default:
            return unreachable(import.meta.env.BUILD_VARIANT);
    }
}
