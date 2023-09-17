import {IdentityType, WorkVerificationLevel} from '~/common/enum';
import type {ContactView} from '~/common/model';
import {unreachable} from '~/common/utils/assert';
import type {ReceiverBadgeType} from '~/common/viewmodel/types';

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
