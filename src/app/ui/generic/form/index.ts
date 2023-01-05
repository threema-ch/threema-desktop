import {markify, TokenType} from '@threema/threema-markup';
import autolinker from 'autolinker';

import {MessageDirection} from '~/common/enum';
import {type Conversation, type RemoteModelFor} from '~/common/model';
import {type Mutable, type u53} from '~/common/types';
import {type Remote} from '~/common/utils/endpoint';
import {dateToUnixTimestampMs} from '~/common/utils/number';
import {type IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {
    type ConversationMessageSetStore,
    type ConversationMessageViewModel,
} from '~/common/viewmodel/conversation-messages';
import {type Mention} from '~/common/viewmodel/utils/mentions';

/**
 * A function that takes a (possibly undefined) string and returns a processed
 * string. If the input is undefined an empty string must be returned.
 */
export type TextProcessor = (text: string | undefined) => string;

/**
 * Escape HTML-unsafe characters in the given input string. If the input is
 * undefined an empty string is returned.
 *
 * @param text string | undefined
 * @returns escaped string
 */
export function escapeHtmlUnsafeChars(text: string | undefined): string {
    if (text === undefined || text === '') {
        return '';
    }

    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/**
 * A list of messages sorted from oldest to newest.
 */
export type SortedMessageList = Remote<ConversationMessageViewModel>[];
/**
 * A store containing a {@link SortedMessageList}.
 */
export type SortedMessageListStore = IQueryableStore<SortedMessageList>;

/**
 * Check whether the message referenced by the index has a different direction than the previous
 * message.
 */
export function hasDirectionChanged(messages: SortedMessageList, index: u53): boolean {
    if (index === 0) {
        return false;
    }

    const lastMessageDirection = messages[index - 1].direction;
    const currentMessageDirection = messages[index].direction;

    return lastMessageDirection !== currentMessageDirection;
}

/**
 * Precalculated information about the unread messages. See doc for each property.
 */
export interface UnreadMessageInfo {
    /**
     * Only true when no unread info has been yet calculated for a given conversation. Given how
     * {@link UnreadMessageInfo} is used, this attribute is easier to use than checking for an
     * undefined object.
     */
    readonly isUnset: boolean;

    /**
     * Index of the earliest unread message, above which a separator will be displayed.
     * Undefined if no message is unread.
     */
    readonly earliestUnreadMessageIndex?: u53;

    /**
     * Instead of iterating over the whole message list, we cache the last message that we checked
     * so that we don't need to re-check messages that have already been checked.
     */
    readonly latestCheckedMessageIndex: u53;

    /**
     * Number of unread inbound messages after `earliestUnreadMessageIndex`.
     */
    readonly inboundUnreadMessageCount: u53;

    /**
     * Indicates whether any outbound messages have been written after the message at index
     * `earliestUnreadMessageIndex` so that we can adapt the UI accordingly.
     */
    readonly hasOutboundMessageAfterEarliestUnreadMessage: boolean;

    /**
     * This property is mutable because the caller of the {@link UnreadMessageInfo} object can set it
     * to `true` to force a recount of the unread messages the next time it is calculated.
     */
    isRecountPending: boolean;
}

export function getUnreadMessageInfo(
    conversation: RemoteModelFor<Conversation>,
    messages: SortedMessageList,
    currentUnreadMessageInfo: UnreadMessageInfo,
): UnreadMessageInfo {
    if (
        currentUnreadMessageInfo.isUnset ||
        currentUnreadMessageInfo.earliestUnreadMessageIndex === undefined ||
        currentUnreadMessageInfo.isRecountPending
    ) {
        return newUnreadMessageInfo(conversation, messages);
    }

    return updateUnreadMessageInfo(messages, {
        ...currentUnreadMessageInfo,
        // Type narrowing does not work properly here.
        earliestUnreadMessageIndex: currentUnreadMessageInfo.earliestUnreadMessageIndex,
    });
}

export const unsetUnreadMessageInfo: UnreadMessageInfo = {
    isUnset: true,
    earliestUnreadMessageIndex: undefined,
    latestCheckedMessageIndex: -1,
    inboundUnreadMessageCount: 0,
    hasOutboundMessageAfterEarliestUnreadMessage: false,
    isRecountPending: false,
};

function newUnreadMessageInfo(
    conversation: RemoteModelFor<Conversation>,
    messages: SortedMessageList,
): UnreadMessageInfo {
    const info: Mutable<UnreadMessageInfo> = {
        ...unsetUnreadMessageInfo,
        isUnset: false,
        latestCheckedMessageIndex: messages.length - 1,
    };

    // Optimization: No need to scan for unread messages if there aren't any
    if (conversation.view.unreadMessageCount < 1) {
        return info;
    }

    // Search for unread messages, starting at the newest message. From there, we search backwards
    // until we find the first message that's either outbound, or that has already been read.
    for (let index = messages.length - 1; index >= 0; index--) {
        const msgView = messages[index].messageStore.get().view;

        if (msgView.direction === MessageDirection.INBOUND && msgView.readAt === undefined) {
            info.earliestUnreadMessageIndex = index;
            info.inboundUnreadMessageCount++;
        } else {
            break;
        }
    }

    return info;
}

function updateUnreadMessageInfo(
    messages: SortedMessageList,
    info: Required<UnreadMessageInfo>,
): UnreadMessageInfo {
    const updatedInfo: Mutable<UnreadMessageInfo> = {
        ...info,
        latestCheckedMessageIndex: messages.length - 1,
    };

    for (let index = messages.length - 1; index > info.latestCheckedMessageIndex; index--) {
        const msgView = messages[index].messageStore.get().view;

        if (msgView.direction === MessageDirection.INBOUND) {
            updatedInfo.inboundUnreadMessageCount++;
        } else {
            updatedInfo.hasOutboundMessageAfterEarliestUnreadMessage = true;
        }
    }

    return updatedInfo;
}

export function isLastMessageOutbound(messageList: SortedMessageList): boolean {
    const lastMessage = messageList.at(-1);
    return lastMessage?.direction === MessageDirection.OUTBOUND;
}

export function isLastOutboundMessageOlderThan(
    messageList: SortedMessageList,
    thresholdAgeInMillis: u53,
): boolean {
    for (let index = messageList.length - 1; index >= 0; index--) {
        const messageStore = messageList[index].messageStore;

        if (messageStore.ctx === MessageDirection.OUTBOUND) {
            const lastOutboundMessageCreatedAt = messageStore.get().view.createdAt;
            const lastOutboundMessageAgeMillis =
                dateToUnixTimestampMs(new Date()) -
                dateToUnixTimestampMs(lastOutboundMessageCreatedAt);

            return lastOutboundMessageAgeMillis > thresholdAgeInMillis;
        }

        if (messageStore.get().view.readAt === undefined) {
            continue;
        }
    }

    // We reached the most recent read inbound message so we can stop the loop and return true.
    return true;
}

/**
 * Derive a sorted list of messages from a set of messages.
 */
export function sortMessages(
    setStore: Remote<ConversationMessageSetStore>,
): SortedMessageListStore {
    return derive(setStore, (conversationMessageSet, getAndSubscribe) =>
        [...conversationMessageSet].sort(
            (a, b) => getAndSubscribe(a.viewModel).ordinal - getAndSubscribe(b.viewModel).ordinal,
        ),
    );
}

/**
 * TODO(WEBMD-536): Temporary solution, which will get replaced after WEBMD-536 is implemented
 * @param date Date
 * @returns string ISO formatted DateTime
 */
export function getDateTimeIsoString(date: Date): string {
    function padStart(number: u53): string {
        return number.toString().padStart(2, '0');
    }

    const year = date.getFullYear();
    const month = padStart(date.getMonth() + 1);
    const day = padStart(date.getDate());
    const hour = padStart(date.getHours());
    const minute = padStart(date.getMinutes());

    return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * TODO(WEBMD-536): Temporary solution, which will get replaced after WEBMD-536 is implemented
 * @param date Date
 * @returns string ISO formatted Time
 */
export function getTimeIsoString(date: Date): string {
    return getDateTimeIsoString(date).split(' ')[1];
}

export function getMentionHtml(mention: Mention): string {
    if (mention.type === 'all') {
        return `<span class="mention all">@All</span>`;
    }

    const mentionDisplay = `@${escapeHtmlUnsafeChars(mention.name)}`;

    if (mention.type === 'self') {
        return `<span class="mention me">${mentionDisplay}</span>`;
    }

    const href = `#/conversation/${mention.lookup.type}/${mention.lookup.uid}/`;
    return `<a href="${href}" draggable="false" class="mention">${mentionDisplay}</a>`;
}

/**
 * Default Textprocessor for text in messages
 */
export function textProcessor(text: string | undefined, mentions: Mention[]): string {
    if (text === undefined || text === '') {
        return '';
    }

    // Replace mentions
    for (const mention of mentions) {
        text = text.replaceAll(`@[${mention.identityString}]`, getMentionHtml(mention));
    }

    text = markify(text, {
        [TokenType.Asterisk]: 'md-bold',
        [TokenType.Underscore]: 'md-italic',
        [TokenType.Tilde]: 'md-strike',
    });

    return autolinker.link(text);
}
