import {MessageDirection} from '~/common/enum';
import type {Conversation, RemoteModelFor} from '~/common/model';
import type {Mutable, u53} from '~/common/types';
import {entriesReverse} from '~/common/utils/array';
import {unwrap} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import {dateToUnixTimestampMs} from '~/common/utils/number';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation-message-set';

/**
 * A list of messages sorted from oldest to newest.
 */
export type SortedMessageList = Remote<ConversationMessageViewModelBundle>[];
/**
 * A store containing a {@link SortedMessageList}.
 */
export type SortedMessageListStore = IQueryableStore<SortedMessageList>;

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
 * Check whether the message referenced by the index has a different direction than the previous
 * message.
 */
export function hasDirectionChanged(messages: SortedMessageList, index: u53): boolean {
    if (index === 0) {
        return false;
    }

    const lastMessageDirection = messages[index - 1]?.direction;
    const currentMessageDirection = unwrap(messages[index]).direction;

    return lastMessageDirection !== undefined && lastMessageDirection !== currentMessageDirection;
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
    for (const [index, message] of entriesReverse(messages)) {
        const messageView = message.messageStore.get().view;

        if (
            messageView.direction === MessageDirection.INBOUND &&
            messageView.readAt === undefined
        ) {
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

    for (const [index, message] of entriesReverse(messages)) {
        if (index <= info.latestCheckedMessageIndex) {
            break;
        }
        const messageView = message.messageStore.get().view;

        if (messageView.direction === MessageDirection.INBOUND) {
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
    messages: SortedMessageList,
    thresholdAgeInMillis: u53,
): boolean {
    for (const [, message] of entriesReverse(messages)) {
        const messageStore = message.messageStore;

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
