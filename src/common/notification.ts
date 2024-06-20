import {ConversationCategory, ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ConversationView, Group} from '~/common/model';
import type {InboundDeletedMessageModelStore} from '~/common/model/message/deleted-message';
import type {AnyInboundNonDeletedMessageModelStore} from '~/common/model/types/message';
import type {AnyReceiverStore} from '~/common/model/types/receiver';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {ChosenGroupCall} from '~/common/network/protocol/call/group-call';
import type {GroupId, IdentityString} from '~/common/network/types';
import type {u53, WeakOpaque} from '~/common/types';
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

export type CustomNotification =
    | GenericNotification
    | NewMessageNotification
    | DeletedMessageNotification
    | GroupCallStartNotification;

interface GenericNotification {
    readonly type: 'generic';
    readonly title: string;
    readonly options: ExtendedNotificationOptions;
    readonly identifier: string;
}

interface NewMessageNotification {
    readonly type: 'new-message';
    readonly receiverConversation: string;
    readonly senderName?: string;
    readonly options: ExtendedNotificationOptions;
    readonly unreadCount: u53;
    readonly identifier: string;
}

export interface DeletedMessageNotification {
    readonly type: 'deleted-message';
    readonly receiverConversation: string;
    readonly senderName?: string;
    readonly options: ExtendedNotificationOptions & {body: undefined};
    readonly unreadCount: u53;
    readonly identifier: string;
}

export interface GroupCallStartNotification {
    readonly type: 'group-call-start';
    readonly groupName: string;
    readonly identifier: string;
    readonly options: ExtendedNotificationOptions;
    readonly startedByContactName?: string;
}

export interface NotificationCreator extends ProxyMarked {
    readonly create: (
        notification: Exclude<CustomNotification, DeletedMessageNotification>,
    ) => NotificationHandle | undefined;

    readonly update: (
        notification: Exclude<CustomNotification, GroupCallStartNotification>,
    ) => NotificationHandle | undefined;
}

export class NotificationService {
    public constructor(
        private readonly _log: Logger,
        private readonly _creator: RemoteProxy<NotificationCreator>,
    ) {}

    public async notifyNewMessage(
        message: AnyInboundNonDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
    ): Promise<void> {
        const {receiverConversation, unreadCount, senderName, body, tag} =
            this._getMessageNotificationParameters(message, conversation);

        await this._creator.create({
            type: 'new-message',
            receiverConversation,
            senderName,
            options: {
                tag,
                body,
                creator: {ignore: 'if-focused'},
            },
            unreadCount,
            identifier: message.get().view.id.toString(),
        });
    }

    public async notifyMessageEdit(
        message: AnyInboundNonDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
    ): Promise<void> {
        const {receiverConversation, unreadCount, senderName, body, tag} =
            this._getMessageNotificationParameters(message, conversation);

        await this._creator.update({
            type: 'new-message',
            receiverConversation,
            senderName,
            options: {
                tag,
                body,
                creator: {ignore: 'if-focused'},
            },
            unreadCount,
            identifier: message.get().view.id.toString(),
        });
    }

    public async notifyMessageDelete(
        message: InboundDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
    ): Promise<void> {
        const {receiverConversation, unreadCount, senderName, tag} =
            this._getMessageNotificationParameters(message, conversation);

        await this._creator.update({
            type: 'deleted-message',
            receiverConversation,
            senderName,
            options: {
                tag,
                body: undefined,
                creator: {ignore: 'if-focused'},
            },
            unreadCount,
            identifier: message.get().view.id.toString(),
        });
    }

    public async notifyGroupCallStart(
        chosenGroupCall: ChosenGroupCall,
        groupModel: Group,
    ): Promise<void> {
        const {groupName, startedByContactName, tag} = this._getGroupCallNotificationParameters(
            chosenGroupCall,
            groupModel,
        );

        await this._creator.create({
            type: 'group-call-start',
            groupName,
            startedByContactName,
            options: {
                tag,
                creator: {},
            },
            identifier:
                chosenGroupCall.type === 'ongoing'
                    ? chosenGroupCall.call.get().ctx.callId.id
                    : chosenGroupCall.base.derivations.callId.id,
        });
    }

    private _getMessageNotificationParameters(
        message: AnyInboundNonDeletedMessageModelStore | InboundDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
    ): {
        receiverConversation: string;
        senderName?: string;
        unreadCount: u53;
        body: string | undefined;
        tag: NotificationTag;
    } {
        const messageModel = message.get();
        const receiverModel = conversation.receiver.get();

        const unreadCount = conversation.view.unreadMessageCount;

        if (receiverModel.type === ReceiverType.DISTRIBUTION_LIST) {
            throw new Error('Cannot receive message from a distribution list');
        }
        const receiverConversation = receiverModel.view.displayName;

        let senderName: string | undefined = undefined;

        if (conversation.receiver.type === ReceiverType.GROUP) {
            senderName = messageModel.controller.sender().get().view.displayName;
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

        return {
            receiverConversation,
            unreadCount,
            senderName,
            body,
            tag: receiverModel.controller.notificationTag,
        };
    }

    private _getGroupCallNotificationParameters(
        chosenGroupCall: ChosenGroupCall,
        groupModel: Group,
    ): {
        groupName: string;
        startedByContactName?: string;
        tag: NotificationTag;
    } {
        const callStartedBy: LocalModelStore<Contact> | undefined = [
            groupModel.view.creator,
            ...groupModel.view.members,
        ].find(
            (memberOrCreatorModel): memberOrCreatorModel is LocalModelStore<Contact> =>
                memberOrCreatorModel !== 'me' &&
                memberOrCreatorModel.get().view.identity === chosenGroupCall.base.startedBy,
        );

        return {
            groupName: groupModel.view.displayName,
            startedByContactName: callStartedBy?.get().view.displayName,
            tag: groupModel.controller.notificationTag,
        };
    }
}
