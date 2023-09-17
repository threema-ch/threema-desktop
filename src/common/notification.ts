import {ConversationCategory, ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ConversationView} from '~/common/model';
import type {AnyInboundMessageModelStore} from '~/common/model/types/message';
import type {AnyReceiverStore} from '~/common/model/types/receiver';
import type {GroupId, IdentityString} from '~/common/network/types';
import type {u53, WeakOpaque} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';
import {u64ToHexLe} from '~/common/utils/number';

// Copied from lib.dom.d.ts
interface NotificationAction {
    readonly action: string;
    readonly icon?: string;
    readonly title: string;
}

// Copied from lib.dom.d.ts
type NotificationDirection = 'auto' | 'ltr' | 'rtl';

/**
 * A notification tag uniquely identifies a notification for replacement.
 *
 * IMPORTANT: All tag formats must be defined here to ensure uniqueness!
 *
 * Tags:
 *
 * - `contact-<IdentityString>`
 * - `group-<creatorIdentityString>-<hex(GroupId)>`
 */
export type NotificationTag = WeakOpaque<string, {readonly NotificationTag: unique symbol}>;

/**
 * Get notification tag for a contact
 */
export function getNotificationTagForContact(identity: IdentityString): NotificationTag {
    return `contact-${identity}` as NotificationTag;
}

/**
 * Get notification tag for a contact
 */
export function getNotificationTagForGroup(
    creator: IdentityString,
    groupId: GroupId,
): NotificationTag {
    return `group-${creator}-${u64ToHexLe(groupId)}` as NotificationTag;
}

/**
 * DOM API notification options, including our extensions.
 */
export interface ExtendedNotificationOptions {
    // Copied from lib.dom.d.ts
    readonly actions?: NotificationAction[];
    readonly badge?: string;
    readonly body?: string;
    readonly data?: unknown;
    readonly dir?: NotificationDirection;
    readonly icon?: string;
    readonly image?: string;
    readonly lang?: string;
    readonly renotify?: boolean;
    readonly requireInteraction?: boolean;
    readonly silent?: boolean;
    readonly timestamp?: u53;
    readonly vibrate?: u53[];

    /**
     * Uniquely identify a notification for replacement.
     *
     * Note: This is compatible with the DOM Notifications API tag.
     */
    readonly tag: NotificationTag;

    /** Custom creator options. */
    readonly creator: {
        /** Declares that the notification may be ignored (not shown) under specific circumstances. */
        ignore?: 'if-focused';
    };
}

export type NotificationHandle = {
    close: () => void;
} & ProxyMarked;

export interface NotificationCreator extends ProxyMarked {
    readonly create: (
        title: string,
        options: ExtendedNotificationOptions,
    ) => NotificationHandle | undefined;
}

export class NotificationService {
    public constructor(
        private readonly _log: Logger,
        private readonly _creator: RemoteProxy<NotificationCreator>,
    ) {}

    public async notifyNewMessage(
        message: AnyInboundMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
    ): Promise<void> {
        // TODO(DESK-255): Handle notifications by settings (ignore notification if disabled in settings)
        this._log.debug('notifyNewMessage');

        // Fetch models
        const messageModel = message.get();
        const receiverModel = conversation.receiver.get();

        // Determine title
        let title;
        const unreadCount = conversation.view.unreadMessageCount;
        switch (receiverModel.type) {
            case ReceiverType.CONTACT: {
                title = `${unreadCount} new message(s) from ${receiverModel.view.displayName}`;
                break;
            }
            case ReceiverType.GROUP: {
                const groupName = receiverModel.view.displayName;
                if (unreadCount === 1) {
                    title = `Message from ${
                        messageModel.controller.sender().get().view.displayName
                    } in ${groupName}`;
                } else {
                    title = `${unreadCount} new message(s) in ${groupName}`;
                }
                break;
            }
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('Cannot receive message from a distribution list');
            default:
                unreachable(receiverModel);
        }

        // Determine body
        let body: string | undefined;
        switch (messageModel.type) {
            case 'text':
                body = messageModel.view.text;
                break;
            default:
                break;
        }

        // Do not show message body on private conversations
        if (conversation.view.category === ConversationCategory.PROTECTED) {
            body = '';
        }

        // Show notification. This automatically replaces an existing notification from the same
        // receiver via the `tag`.
        await this._creator.create(title, {
            tag: receiverModel.controller.notificationTag,
            body,
            creator: {ignore: 'if-focused'},
        });
    }
}
