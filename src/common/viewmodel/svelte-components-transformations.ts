import {
    type VerificationLevel,
    type VerificationLevelColors,
} from '#3sc/components/threema/VerificationDots';
import {type PublicKey} from '~/common/crypto';
import {type DbReceiverLookup} from '~/common/db';
import {
    ContactNotificationTriggerPolicy,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    IdentityType,
    NotificationSoundPolicy,
    ReceiverType,
    VerificationLevel as NumericVerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {
    type AnyReceiver,
    type Contact,
    type ContactRepository,
    type ContactView,
    type Group,
    type GroupView,
    type ProfilePicture,
    type Repositories,
    type Settings,
} from '~/common/model';
import {unreachable} from '~/common/utils/assert';
import {
    type AnyReceiverData,
    type ContactData,
    type GroupUserState as GroupUserState3SC,
    type ReceiverBadgeType,
} from '~/common/viewmodel/types';

import {getMemberNames} from './group-list-item';

export type TransformedReceiverData = AnyReceiverData & {
    /**
     * Notification policy for this conversation.
     */
    readonly notifications: ReceiverNotificationPolicy;
};

export type ReceiverNotificationPolicy = 'default' | 'muted' | 'mentioned' | 'never';

export function transformContact(
    contact: Contact,
    profilePicture: ProfilePicture,
    settings: Settings,
): TransformedReceiverData {
    // Determine badge type.
    //
    // Note: We only display contact badges when the identity type differs from our own identity
    //       type (i.e. the build variant).
    let badge: ReceiverBadgeType | undefined;
    switch (contact.view.identityType) {
        case IdentityType.REGULAR:
            badge = import.meta.env.BUILD_VARIANT !== 'consumer' ? 'contact-consumer' : undefined;
            break;
        case IdentityType.WORK:
            badge = import.meta.env.BUILD_VARIANT !== 'work' ? 'contact-work' : undefined;
            break;
        default:
            unreachable(contact.view.identityType);
    }

    // Determine verification level
    const {verificationLevel, verificationLevelColors} = transformContactVerificationLevel(contact);

    // Done
    return {
        type: 'contact',
        name: contact.view.displayName,
        profilePicture: {
            img: undefined,
            color: profilePicture.view.color,
            initials: contact.view.initials,
        },
        badge,
        verificationLevel,
        verificationLevelColors,
        blocked: settings.contactIsBlocked(contact.view.identity),
        notifications: transformNotificationPolicyFromContact(contact.view),
    };
}

function transformGroup(
    group: Group,
    profilePicture: ProfilePicture,
    contacts: ContactRepository,
): TransformedReceiverData {
    const memberNames = getMemberNames(group.view.members, contacts);

    return {
        type: 'group',
        name: group.view.displayName,
        profilePicture: {
            img: undefined,
            color: profilePicture.view.color,
            initials: group.view.displayName.slice(0, 2),
        },
        members: group.view.members,
        memberNames,
        userState: transformGroupUserState(group.view.userState),
        notifications: transformNotificationPolicyFromGroup(group.view),
    };
}

export function transformReceiver(
    receiver: AnyReceiver,
    profilePicture: ProfilePicture,
    model: Repositories,
): TransformedReceiverData {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return transformContact(receiver, profilePicture, model.settings);
        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(WEBMD-236): Implement distribution list');
        case ReceiverType.GROUP:
            return transformGroup(receiver, profilePicture, model.contacts);
        default:
            return unreachable(receiver);
    }
}

/**
 * Return the transformed verification level and color information.
 */
export function transformContactVerificationLevel(
    contact: Contact,
): Pick<TransformedContact, 'verificationLevel' | 'verificationLevelColors'> {
    // Determine verification level
    let verificationLevel: TransformedContact['verificationLevel'];
    switch (contact.view.verificationLevel) {
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
            unreachable(contact.view.verificationLevel);
    }

    // Determine verification level colors
    let verificationLevelColors: TransformedContact['verificationLevelColors'];
    switch (contact.view.workVerificationLevel) {
        case WorkVerificationLevel.NONE:
            verificationLevelColors = 'default';
            break;
        case WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED:
            verificationLevelColors = 'shared-work-subscription';
            break;
        default:
            unreachable(contact.view.workVerificationLevel);
    }

    return {verificationLevel, verificationLevelColors};
}

export function transformNotificationPolicyFromContact(
    view: ContactView,
): ReceiverNotificationPolicy {
    let notifications: ReceiverNotificationPolicy = 'default';
    if (view.notificationTriggerPolicyOverride?.policy === ContactNotificationTriggerPolicy.NEVER) {
        notifications = 'never';
    } else if (view.notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED) {
        notifications = 'muted';
    }
    return notifications;
}

/**
 * Transformed data necessary to display a contact in several places in the UI.
 */
export interface TransformedContact extends ContactData {
    readonly lookup: DbReceiverLookup;
    readonly isNew: boolean;
    readonly identity: string;
    readonly publicKey: PublicKey;
    readonly nickname: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly displayName: string;
    readonly initials: string;
    readonly verificationLevel: VerificationLevel;
    readonly verificationLevelColors: VerificationLevelColors;
    readonly notifications: ReceiverNotificationPolicy;
    readonly activityState: 'active' | 'inactive' | 'invalid';
}

export function transformGroupUserState(userState: GroupUserState): GroupUserState3SC {
    switch (userState) {
        case GroupUserState.MEMBER:
            return 'member';
        case GroupUserState.KICKED:
            return 'kicked';
        case GroupUserState.LEFT:
            return 'left';
        default:
            return unreachable(userState);
    }
}

export function transformNotificationPolicyFromGroup(view: GroupView): ReceiverNotificationPolicy {
    // Determine notifications badge
    let notifications: ReceiverNotificationPolicy = 'default';
    if (view.notificationTriggerPolicyOverride?.policy === GroupNotificationTriggerPolicy.NEVER) {
        notifications = 'never';
    } else if (view.notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED) {
        notifications = 'muted';
    }
    return notifications;
}
