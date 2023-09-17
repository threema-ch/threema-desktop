import {
    ActivityState,
    ContactNotificationTriggerPolicy,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    NotificationSoundPolicy,
    ReceiverType,
} from '~/common/enum';
import type {
    AnyReceiver,
    ContactView,
    GroupView,
    ProfilePictureView,
    RemoteModelFor,
} from '~/common/model';
import type {IdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {
    VerificationLevel,
    VerificationLevelColors,
} from '~/common/viewmodel/contact-list-item';
import type {ReceiverBadgeType} from '~/common/viewmodel/types';
import type {Mention} from '~/common/viewmodel/utils/mentions';

export interface ReceiverProfilePicture {
    readonly profilePicture: ProfilePictureView;
    readonly alt: string;
    readonly initials: string;
    readonly unread: u53;
    readonly badge?: ReceiverBadgeType;
}

export interface ReceiverTitle {
    readonly title: string;
    readonly subtitle?:
        | string
        | {
              text: string | undefined;
              mentions?: Mention[];
          };
    /**
     * Whether this receiver is not able to be contacted.
     */
    readonly isDisabled?: boolean;
    /**
     * Whether the receiver hasn't been active for a while.
     */
    readonly isInactive?: boolean;
    /**
     * Whether the receiver is invalid (i.e., the ID doesn't exist, etc.).
     */
    readonly isInvalid?: boolean;
    /**
     * Whether the receiver is the creator (in the context of a group).
     */
    readonly isCreator?: boolean;
    /**
     * Whether the conversation with the receiver is archived.
     */
    readonly isArchived?: boolean;
    /**
     * Whether there is a pending draft that belongs to the conversation with this receiver.
     */
    readonly isDraft?: boolean;
}

export type ReceiverNotificationPolicy = 'default' | 'muted' | 'mentioned' | 'never';

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

interface BaseReceiver {
    readonly profilePicture: ReceiverProfilePicture;
    readonly title: {
        readonly text: string;
        readonly isDisabled?: boolean;
    };
    readonly subtitle?: {
        readonly text?: string;
        readonly badges?: {
            readonly isInactive?: boolean;
            readonly isInvalid?: boolean;
            readonly isCreator?: boolean;
            readonly isArchived?: boolean;
            readonly isDraft?: boolean;
        };
    };
}

export interface ContactReceiver extends BaseReceiver {
    readonly type: 'contact';
    readonly verificationDot: {
        readonly color: VerificationLevelColors;
        readonly level: VerificationLevel;
    };
    readonly identity: IdentityString;
    readonly isBlocked: boolean;
}
interface ConversationPreviewReceiver extends BaseReceiver {
    readonly type: 'conversation-preview';
}
interface ConversationHeaderReceiver extends BaseReceiver {
    readonly type: 'conversation-header';
}
interface DistributionListReceiver extends BaseReceiver {
    readonly type: 'distribution-list';
}
export interface GroupReceiver extends BaseReceiver {
    readonly type: 'group';
    readonly membersCount: u53;
}
interface GroupMemberReceiver extends BaseReceiver {
    readonly type: 'group-member';
}

export type Receiver =
    | ContactReceiver
    | ConversationPreviewReceiver
    | ConversationHeaderReceiver
    | DistributionListReceiver
    | GroupReceiver
    | GroupMemberReceiver;

/**
 * Returns whether the receiver is of type "contact" and is also inactive.
 */
export function isInactiveContact(receiver: RemoteModelFor<AnyReceiver> | undefined): boolean {
    if (receiver === undefined) {
        return false;
    }

    return (
        receiver.type === ReceiverType.CONTACT &&
        receiver.view.activityState === ActivityState.INACTIVE
    );
}

/**
 * Returns whether the receiver is of type "contact" and is also invalid.
 */
export function isInvalidContact(receiver: RemoteModelFor<AnyReceiver> | undefined): boolean {
    if (receiver === undefined) {
        return false;
    }

    return (
        receiver.type === ReceiverType.CONTACT &&
        receiver.view.activityState === ActivityState.INVALID
    );
}

/**
 * Returns whether the receiver is disabled (i.e., it can't be contacted because its ID is invalid,
 * it's a group which the user has left or was kicked from, etc.).
 */
export function isDisabledReceiver(receiver: RemoteModelFor<AnyReceiver> | undefined): boolean {
    if (receiver === undefined) {
        return false;
    }

    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return receiver.view.activityState === ActivityState.INVALID;

        case ReceiverType.GROUP:
            return (
                receiver.view.userState === GroupUserState.KICKED ||
                receiver.view.userState === GroupUserState.LEFT
            );

        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(DESK-771): Support distribution lists
            return false;

        default:
            return unreachable(receiver);
    }
}
