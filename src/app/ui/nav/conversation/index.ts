import {
    type ReceiverNotificationPolicy,
    transformNotificationPolicyFromContact,
    transformNotificationPolicyFromGroup,
} from '~/app/ui/generic/receiver';
import {type DbConversationUid, type DbReceiverLookup} from '~/common/db';
import {
    type ConversationCategory,
    type ConversationVisibility,
    GroupUserState,
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
} from '~/common/model';
import {type RemoteModelStore} from '~/common/model/utils/model-store';
import {type u53} from '~/common/types';
import {unreachable, unwrap} from '~/common/utils/assert';
import {DeprecatedDerivedStore, type IQueryableStore, WritableStore} from '~/common/utils/store';
import {type ReceiverBadgeType} from '~/common/viewmodel/types';
import {getContactBadge} from '~/common/viewmodel/utils/contact';

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

function transformContact(contact: RemoteModelFor<Contact>): ConversationPreviewData['receiver'] {
    return {
        lookup: {
            type: ReceiverType.CONTACT,
            uid: contact.ctx,
        },
        badge: getContactBadge(contact.view),
        name: contact.view.displayName,
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
        notifications: transformNotificationPolicyFromGroup(group.view),
    };
}

export function transformReceiver(
    receiver: RemoteModelFor<AnyReceiver>,
): ConversationPreviewData['receiver'] {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return transformContact(receiver);
        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(DESK-236): Distribution lists');
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
    return receiver.view.userState !== GroupUserState.MEMBER;
}

/**
 * Conversation preview list filter/search term (if any).
 */
export const conversationPreviewListFilter = new WritableStore('');
