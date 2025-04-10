import type {ServicesForBackend} from '~/common/backend';
import {
    ContactNotificationTriggerPolicy,
    ConversationCategory,
    GroupNotificationTriggerPolicy,
    NotificationSoundPolicy,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ConversationView, Group, ServicesForModel} from '~/common/model';
import type {InboundDeletedMessageModelStore} from '~/common/model/message/deleted-message';
import type {ContactView} from '~/common/model/types/contact';
import type {GroupView} from '~/common/model/types/group';
import type {AnyInboundNonDeletedMessageModelStore} from '~/common/model/types/message';
import type {AnyReceiverStore} from '~/common/model/types/receiver';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {ChosenGroupCall} from '~/common/network/protocol/call/group-call';
import type {GroupId, IdentityString} from '~/common/network/types';
import type {u53, WeakOpaque} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';
import {
    EVERYONE_IDENTITY_STRING,
    getMentionedIdentities,
    getMentionMatches,
    type MentionMatch,
} from '~/common/utils/mentions';
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

// Default notification settings
const DEFAULT_NOTIFICATION_TRIGGER_SETTING = true;
const DEFAULT_NOTIFICATION_SILENCE_SETTING = false;

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
        private readonly _services: Pick<ServicesForBackend, 'device'>,
        private readonly _log: Logger,
        private readonly _creator: RemoteProxy<NotificationCreator>,
    ) {}

    /**
     * Handles the notification of a newly incoming message.
     *
     * This function decides whether or not a notification is shown and if it is going to be silent
     * depending on the settings of the corresponding conversation. It also replaces any raw mention
     * string with a semantic mention string that uses the display name of the mentioned user.
     */
    public async notifyNewMessage(
        message: AnyInboundNonDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
        userDisplayName: string,
    ): Promise<void> {
        const {receiverConversation, unreadCount, senderName, body, tag} =
            this._getMessageNotificationParameters(message, conversation);

        const notificationOptions = this._getNotificationSettings(conversation.receiver, body);
        if (!notificationOptions.notify) {
            return;
        }

        let replacedBody = body;
        if (conversation.receiver.type === ReceiverType.GROUP && body !== undefined) {
            replacedBody = this._replaceMentions(
                body,
                userDisplayName,
                conversation.receiver.get().view,
                getMentionMatches(body),
            );
        }

        await this._creator.create({
            type: 'new-message',
            receiverConversation,
            senderName,
            options: {
                tag,
                body: replacedBody,
                creator: {ignore: 'if-focused'},
                silent: notificationOptions.silent,
            },
            unreadCount,
            identifier: message.get().view.id.toString(),
        });
    }

    /**
     * Handles the notification of an edited existing message.
     *
     * This function decides whether or not a notification is shown and if it is going to be silent
     * depending on the settings of the corresponding conversation. It also replaces any raw mention
     * string with a semantic mention string that uses the display name of the mentioned user.
     *
     * Note: Notifications of edited messages are only shown if the notification of the original
     * message is still lingering around.
     */
    public async notifyMessageEdit(
        message: AnyInboundNonDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
        userDisplayName: string,
    ): Promise<void> {
        const {receiverConversation, unreadCount, senderName, body, tag} =
            this._getMessageNotificationParameters(message, conversation);

        const notificationOptions = this._getNotificationSettings(conversation.receiver, body);
        if (!notificationOptions.notify) {
            return;
        }

        let replacedBody = body;
        if (conversation.receiver.type === ReceiverType.GROUP && body !== undefined) {
            replacedBody = this._replaceMentions(
                body,
                userDisplayName,
                conversation.receiver.get().view,
                getMentionMatches(body),
            );
        }

        await this._creator.update({
            type: 'new-message',
            receiverConversation,
            senderName,
            options: {
                tag,
                body: replacedBody,
                creator: {ignore: 'if-focused'},
                silent: notificationOptions.silent,
            },
            unreadCount,
            identifier: message.get().view.id.toString(),
        });
    }

    /**
     * Handles the notification of a deleted existing message.
     *
     * This function decides whether or not a notification is shown and if it is going to be silent
     * depending on the settings of the corresponding conversation.
     *
     *  Note: Notifications of deleted messages are only shown if the notification of the original
     * message is still lingering around.
     */
    public async notifyMessageDelete(
        message: InboundDeletedMessageModelStore,
        conversation: {
            readonly receiver: AnyReceiverStore;
            readonly view: ConversationView;
        },
    ): Promise<void> {
        const {receiverConversation, unreadCount, senderName, tag} =
            this._getMessageNotificationParameters(message, conversation);

        const notificationOptions = this._getNotificationSettings(conversation.receiver);
        if (!notificationOptions.notify) {
            return;
        }

        await this._creator.update({
            type: 'deleted-message',
            receiverConversation,
            senderName,
            options: {
                tag,
                body: undefined,
                creator: {ignore: 'if-focused'},
                silent: notificationOptions.silent,
            },
            unreadCount,
            identifier: message.get().view.id.toString(),
        });
    }

    /**
     * Handles the notification of an incoming group call.
     *
     * This function decides whether or not a notification is shown and if it is going to be silent
     * depending on the settings of the corresponding conversation.
     *
     */
    public async notifyGroupCallStart(
        chosenGroupCall: ChosenGroupCall,
        groupModel: Group,
    ): Promise<void> {
        const {groupName, startedByContactName, tag} = this._getGroupCallNotificationParameters(
            chosenGroupCall,
            groupModel,
        );

        const notificationOptions = this._getNotificationSettings(
            groupModel.controller.conversation().get().controller.receiver(),
        );
        if (!notificationOptions.notify) {
            return;
        }

        await this._creator.create({
            type: 'group-call-start',
            groupName,
            startedByContactName,
            options: {
                tag,
                creator: {},
                silent: notificationOptions.silent,
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
        const callStartedBy: ModelStore<Contact> | undefined = [
            groupModel.view.creator,
            ...groupModel.view.members,
        ].find(
            (memberOrCreatorModel): memberOrCreatorModel is ModelStore<Contact> =>
                memberOrCreatorModel !== 'me' &&
                memberOrCreatorModel.get().view.identity === chosenGroupCall.base.startedBy,
        );

        return {
            groupName: groupModel.view.displayName,
            startedByContactName: callStartedBy?.get().view.displayName,
            tag: groupModel.controller.notificationTag,
        };
    }

    private _getNotificationSettings(
        receiver: AnyReceiverStore,
        text?: string,
    ): {readonly notify: false} | {readonly notify: true; readonly silent: boolean} {
        switch (receiver.type) {
            case ReceiverType.CONTACT: {
                return parseContactNotificationSettings(receiver.get().view);
            }
            case ReceiverType.GROUP:
                return parseGroupNotificationSettings(
                    this._services,
                    text ?? '',
                    receiver.get().view,
                );

            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('DESK-236: Not implemented yet');

            default:
                return unreachable(receiver);
        }
    }

    /**
     * Replace all mentions with the corresponding display names except for `@[@@@@@@@@]` and
     * `@[UserIdentity]`.
     */
    private _replaceMentions(
        text: string,
        userDisplayName: string,
        groupView: GroupView,
        mentionPairs: readonly MentionMatch[],
    ): string {
        const groupMemberArray = [...groupView.members];
        let resultString = text.slice();
        for (const mentionPair of mentionPairs) {
            if (mentionPair.identity === this._services.device.identity.string) {
                resultString = resultString.replace(mentionPair.raw, `@${userDisplayName}`);
                continue;
            }
            const correspondingGroupMember = groupMemberArray.find(
                (member) => member.get().view.identity === mentionPair.identity,
            );
            // If we found the group member
            if (correspondingGroupMember) {
                resultString = resultString.replace(
                    mentionPair.raw,
                    `@${correspondingGroupMember.get().view.displayName}`,
                );
                continue;
            }

            if (
                groupView.creator !== 'me' &&
                groupView.creator.get().view.identity === mentionPair.identity
            ) {
                resultString = resultString.replace(
                    mentionPair.raw,
                    `@${groupView.creator.get().view.displayName}`,
                );
                continue;
            }
        }

        return resultString;
    }
}

/**
 * Parse the contact notification settings into a suitable format.
 */
function parseContactNotificationSettings(
    contactView: ContactView,
): {readonly notify: false} | {readonly notify: true; readonly silent: boolean} {
    const {notificationSoundPolicyOverride, notificationTriggerPolicyOverride} = contactView;
    const silent =
        notificationSoundPolicyOverride === undefined
            ? DEFAULT_NOTIFICATION_SILENCE_SETTING
            : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED;

    if (notificationTriggerPolicyOverride === undefined) {
        return {
            notify: DEFAULT_NOTIFICATION_TRIGGER_SETTING,
            silent,
        };
    }

    if (notificationTriggerPolicyOverride.expiresAt === undefined) {
        return {
            notify:
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                notificationTriggerPolicyOverride.policy !== ContactNotificationTriggerPolicy.NEVER,
            silent,
        };
    }

    return {
        notify:
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            notificationTriggerPolicyOverride.policy !== ContactNotificationTriggerPolicy.NEVER ||
            notificationTriggerPolicyOverride.expiresAt.getTime() < Date.now(),
        silent,
    };
}

/**
 * Parse the notification settings of a group into a suitable format.
 */
function parseGroupNotificationSettings(
    services: Pick<ServicesForModel, 'device'>,
    text: string,
    groupView: GroupView,
): {readonly notify: false} | {readonly notify: true; readonly silent: boolean} {
    const {notificationSoundPolicyOverride, notificationTriggerPolicyOverride} = groupView;
    const mentions = getMentionedIdentities(text);
    const userIsMentioned =
        mentions.has(EVERYONE_IDENTITY_STRING) || mentions.has(services.device.identity.string);
    const silent =
        notificationSoundPolicyOverride === undefined
            ? DEFAULT_NOTIFICATION_SILENCE_SETTING
            : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED;

    if (notificationTriggerPolicyOverride === undefined) {
        return {
            notify: DEFAULT_NOTIFICATION_TRIGGER_SETTING,
            silent,
        };
    }

    // The only way we are notified when a policy is set is when the user is mentioned and the
    // policy allows notify-on-mention.
    const shouldNotifyPolicy =
        notificationTriggerPolicyOverride.policy === GroupNotificationTriggerPolicy.MENTIONED &&
        userIsMentioned;
    if (notificationTriggerPolicyOverride.expiresAt === undefined) {
        return {
            notify: shouldNotifyPolicy,
            silent,
        };
    }

    return {
        notify:
            shouldNotifyPolicy ||
            notificationTriggerPolicyOverride.expiresAt.getTime() < Date.now(),
        silent,
    };
}
