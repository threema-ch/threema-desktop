import type {
    VerificationLevel,
    VerificationLevelColors,
} from '#3sc/components/threema/VerificationDots';
import type {PublicKey} from '~/common/crypto';
import type {DbContactReceiverLookup} from '~/common/db';
import {
    ContactNotificationTriggerPolicy,
    GroupNotificationTriggerPolicy,
    NotificationSoundPolicy,
    ReceiverType,
    VerificationLevel as NumericVerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import type {
    AnyMessageModel,
    AnyReceiver,
    Contact,
    ContactView,
    Group,
    GroupView,
    Repositories,
} from '~/common/model';
import type {ContactRepository} from '~/common/model/types/contact';
import type {PrivacySettings} from '~/common/model/types/settings';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {Nickname} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import {getMemberNames} from '~/common/viewmodel/group-list-item';
import type {AnyReceiverData, ContactData, Reactions} from '~/common/viewmodel/types';
import {getContactBadge} from '~/common/viewmodel/utils/contact';

export type TransformedReceiverData = AnyReceiverData & {
    /**
     * Notification policy for this conversation.
     */
    readonly notifications: ReceiverNotificationPolicy;
};

export type ReceiverNotificationPolicy = 'default' | 'muted' | 'mentioned' | 'never';

export function transformReactions(
    message: AnyMessageModel,
    contacts: ContactRepository,
): Reactions {
    const reactions = message.view.reactions;
    const transformedReactions: Reactions = [];
    reactions.forEach((reaction) => {
        // If the contact was deleted the reaction should still be there
        // so we just display the identity that is associated with the reaction
        const reactionSenderName =
            reaction.senderIdentity !== 'me'
                ? contacts.getByIdentity(reaction.senderIdentity)?.get().view.displayName ??
                  reaction.senderIdentity
                : reaction.senderIdentity;

        transformedReactions.push({
            at: reaction.reactionAt,
            reactionSender: {
                identity: reaction.senderIdentity,
                name: reactionSenderName,
            },
            type: reaction.reaction,
        });
    });

    return transformedReactions;
}

export function transformContact(
    privacySettings: LocalModelStore<PrivacySettings>,
    contact: Contact,
    getAndSubscribe: GetAndSubscribeFunction,
): TransformedReceiverData {
    // Determine verification level
    const {verificationLevel, verificationLevelColors} = transformContactVerificationLevel(contact);

    // Done
    return {
        type: 'contact',
        uid: contact.ctx,
        name: contact.view.displayName,
        profilePictureFallback: {
            color: contact.view.color,
            initials: contact.view.initials,
        },
        badge: getContactBadge(contact.view),
        verificationLevel,
        verificationLevelColors,
        isBlocked: getAndSubscribe(privacySettings).controller.isIdentityExplicitlyBlocked(
            contact.view.identity,
        ),
        notifications: transformNotificationPolicyFromContact(contact.view),
    };
}

function transformGroup(group: Group, contacts: ContactRepository): TransformedReceiverData {
    const memberNames = getMemberNames(group.view.members, contacts);

    return {
        type: 'group',
        name: group.view.displayName,
        profilePictureFallback: {
            color: group.view.color,
            initials: group.view.displayName.slice(0, 2),
        },
        members: group.view.members,
        memberNames,
        notifications: transformNotificationPolicyFromGroup(group.view),
    };
}

export function transformReceiver(
    receiver: AnyReceiver,
    model: Repositories,
    getAndSubscribe: GetAndSubscribeFunction,
): TransformedReceiverData {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return transformContact(model.user.privacySettings, receiver, getAndSubscribe);
        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(DESK-236): Implement distribution list');
        case ReceiverType.GROUP:
            return transformGroup(receiver, model.contacts);
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
    readonly lookup: DbContactReceiverLookup;
    readonly isNew: boolean;
    readonly identity: string;
    readonly publicKey: PublicKey;
    readonly nickname: Nickname | undefined;
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
