import {
    ContactNotificationTriggerPolicy,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    NotificationSoundPolicy,
    ReceiverType,
} from '~/common/enum';
import {
    type AnyReceiver,
    type ContactView,
    type GroupView,
    type ProfilePictureView,
    type RemoteModelFor,
} from '~/common/model';
import {type IdentityString} from '~/common/network/types';
import {type u53} from '~/common/types';
import {
    type VerificationLevel,
    type VerificationLevelColors,
} from '~/common/viewmodel/contact-list-item';
import {type ReceiverBadgeType} from '~/common/viewmodel/types';
import {type Mention} from '~/common/viewmodel/utils/mentions';

export interface ReceiverProfilePicture {
    readonly profilePicture: ProfilePictureView;
    readonly alt: string;
    readonly initials: string;
    readonly unread: u53;
    readonly badge?: ReceiverBadgeType;
}

export interface ReceiverTitle {
    readonly title: string;
    readonly titleLineThrough?: boolean;
    readonly subtitle?:
        | string
        | {
              text: string | undefined;
              mentions?: Mention[];
          };
    readonly isInactive?: boolean;
    readonly isCreator?: boolean;
    readonly isArchived?: boolean;
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

export function isInactiveGroup(receiver: RemoteModelFor<AnyReceiver>): boolean {
    return (
        receiver.type === ReceiverType.GROUP && receiver.view.userState !== GroupUserState.MEMBER
    );
}

interface BaseReceiver {
    readonly profilePicture: ReceiverProfilePicture;
    readonly title: {
        readonly text: string;
        readonly lineThrough?: boolean;
    };
    readonly subtitle?: {
        readonly text?: string;
        readonly badges?: {
            readonly isInactive?: boolean;
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
