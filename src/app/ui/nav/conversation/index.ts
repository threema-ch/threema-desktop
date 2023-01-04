import {isUserStateOfInactiveGroup, transformGroupUserState} from '~/app/ui/aside/group-details';
import {
    type ReceiverNotificationPolicy,
    transformNotificationPolicyFromContact,
    transformNotificationPolicyFromGroup,
} from '~/app/ui/generic/receiver';
import {type DbConversationUid, type DbReceiverLookup} from '~/common/db';
import {
    type ConversationCategory,
    type ConversationVisibility,
    IdentityType,
    MessageReaction,
    ReceiverType,
} from '~/common/enum';
import {
    type AnyReceiver,
    type AnyReceiverStore,
    type Contact,
    type Conversation,
    type Group,
    type ProfilePicture,
    type RemoteModelFor,
    type RemoteModelStoreFor,
    type Settings,
} from '~/common/model';
import {type RemoteModelStore} from '~/common/model/utils/model-store';
import {type u53} from '~/common/types';
import {unreachable, unwrap} from '~/common/utils/assert';
import {type Remote} from '~/common/utils/endpoint';
import {type IQueryableStore, DeprecatedDerivedStore, WritableStore} from '~/common/utils/store';
import {
    type GroupUserState as GroupUserState3SC,
    type MessageReaction as SCMessageReaction,
    type ReceiverBadgeType,
} from '~/common/viewmodel/types';

/**
 * Transformed data necessary to display a conversation preview.
 */
export interface ConversationPreviewData {
    /**
     * Conversation data.
     */
    readonly conversation: {
        /**
         * Conversation UID.
         */
        readonly uid: DbConversationUid;
        /**
         * Conversation category.
         */
        readonly category: ConversationCategory;
        /**
         * Conversation visibility.
         */
        readonly visibility: ConversationVisibility;
        /**
         * Unread messages counter.
         */
        readonly unread: u53;
    };
    /**
     * Receiver data.
     */
    readonly receiver: {
        /**
         * Receiver UID and type.
         */
        readonly lookup: DbReceiverLookup;
        /**
         * Receiver badge type to display.
         */
        readonly badge?: ReceiverBadgeType;
        /**
         * Display name of the receiver.
         */
        readonly name: string;
        /**
         * Whether the conversation (contact) is being blocked.
         */
        readonly blocked: boolean;
        /**
         * Notification policy for this conversation.
         */
        readonly notifications: ReceiverNotificationPolicy;
    };
}

/**
 * Stores necessary to display a conversation preview.
 */
export interface ConversationPreviewStores {
    /**
     * Receiver store.
     */
    readonly receiver: RemoteModelStoreFor<AnyReceiverStore>;

    /**
     * Profile picture of the receiver.
     */
    readonly profilePicture: RemoteModelStore<ProfilePicture>;
}

export function filterConversations(
    set: ReadonlySet<RemoteModelStore<Conversation>>,
): IQueryableStore<readonly RemoteModelStore<Conversation>[]> {
    return new DeprecatedDerivedStore([...set.values()], (item) =>
        item
            .map(([store]) => store)
            .filter((conversation) => conversation.get().view.lastUpdate !== undefined)
            .sort((a, b) => {
                const aTime = unwrap(a.get().view.lastUpdate).getTime();
                const bTime = unwrap(b.get().view.lastUpdate).getTime();
                if (aTime > bTime) {
                    return -1;
                }
                if (aTime < bTime) {
                    return 1;
                }
                return 0;
            }),
    );
}

export async function getStores(
    conversation: RemoteModelFor<Conversation>,
): Promise<ConversationPreviewStores> {
    const {controller} = conversation;
    const [receiver] = await Promise.all([controller.receiver()]);
    const profilePicture = await receiver.get().controller.profilePicture();
    return {
        receiver,
        profilePicture,
    };
}

export function transformReactionType(reactionType: MessageReaction): SCMessageReaction {
    switch (reactionType) {
        case MessageReaction.ACKNOWLEDGE:
            return 'acknowledged';
        case MessageReaction.DECLINE:
            return 'declined';
        default:
            return unreachable(reactionType);
    }
}

export function transformConversation(
    conversation: RemoteModelFor<Conversation>,
): ConversationPreviewData['conversation'] {
    return {
        uid: conversation.ctx,
        category: conversation.view.category,
        visibility: conversation.view.visibility,
        unread: conversation.view.unreadMessageCount,
    };
}

async function transformContact(
    settings: Remote<Settings>,
    contact: RemoteModelFor<Contact>,
): Promise<ConversationPreviewData['receiver']> {
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

    // Done
    return {
        lookup: {
            type: ReceiverType.CONTACT,
            uid: contact.ctx,
        },
        badge,
        name: contact.view.displayName,
        blocked: await settings.contactIsBlocked(contact.view.identity),
        notifications: transformNotificationPolicyFromContact(contact.view),
    };
}

function transformGroup(group: RemoteModelFor<Group>): ConversationPreviewData['receiver'] {
    return {
        lookup: {
            type: group.type,
            uid: group.ctx,
        },
        name: group.view.displayName,
        blocked: false,
        notifications: transformNotificationPolicyFromGroup(group.view),
    };
}

export async function transformReceiver(
    settings: Remote<Settings>,
    receiver: RemoteModelFor<AnyReceiver>,
): Promise<ConversationPreviewData['receiver']> {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return await transformContact(settings, receiver);
        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(WEBMD-236): Distribution lists');
        case ReceiverType.GROUP:
            return transformGroup(receiver);
        default:
            return unreachable(receiver);
    }
}

export function isInactiveGroup(receiver: RemoteModelFor<AnyReceiver> | undefined): boolean {
    if (receiver === undefined || receiver.type !== ReceiverType.GROUP) {
        return false;
    }
    const groupUserState: GroupUserState3SC = transformGroupUserState(receiver.view.userState);
    return isUserStateOfInactiveGroup(groupUserState);
}

/**
 * Conversation preview list filter/search term (if any).
 */
export const conversationPreviewListFilter = new WritableStore('');
