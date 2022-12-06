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

import {MessageDirection} from '~/common/enum';
import {type Conversation, type RemoteModelFor} from '~/common/model';
import {type Mutable, type u53} from '~/common/types';
import {type RemoteObject} from '~/common/utils/endpoint';
import {type IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {
    type ConversationMessageSetStore,
    type ConversationMessageViewModel,
} from '~/common/viewmodel/conversation-messages';

export type SortedMessageList = RemoteObject<ConversationMessageViewModel>[];
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

export interface UnreadMessageInfo {
    readonly earliestUnreadMessageIndex?: u53;
    readonly latestCheckedMessageIndex: u53;
    readonly inboundMessageCount: u53;
    readonly hasOutboundMessageAfterEarliestUnreadMessage: boolean;
}

export function getUnreadMessageInfo(
    conversation: RemoteModelFor<Conversation>,
    messages: SortedMessageList,
    currentUnreadMessageInfo: UnreadMessageInfo | undefined,
): UnreadMessageInfo {
    if (currentUnreadMessageInfo?.earliestUnreadMessageIndex === undefined) {
        return getInitialUnreadMessageInfo(conversation, messages);
    }

    return updateUnreadMessageInfo(messages, {
        ...currentUnreadMessageInfo,
        // Type narrowing does not work properly here.
        earliestUnreadMessageIndex: currentUnreadMessageInfo.earliestUnreadMessageIndex,
    });
}

function getInitialUnreadMessageInfo(
    conversation: RemoteModelFor<Conversation>,
    messages: SortedMessageList,
): UnreadMessageInfo {
    const info: Mutable<UnreadMessageInfo> = {
        earliestUnreadMessageIndex: undefined,
        latestCheckedMessageIndex: messages.length - 1,
        inboundMessageCount: 0,
        hasOutboundMessageAfterEarliestUnreadMessage: false,
    };

    if (conversation.view.unreadMessageCount < 1) {
        return info;
    }

    for (let index = messages.length - 1; index >= 0; index--) {
        const msgView = messages[index].messageStore.get().view;

        if (msgView.direction === MessageDirection.INBOUND && msgView.readAt === undefined) {
            info.earliestUnreadMessageIndex = index;
            info.inboundMessageCount++;
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
            updatedInfo.inboundMessageCount++;
        } else {
            updatedInfo.hasOutboundMessageAfterEarliestUnreadMessage = true;
        }
    }

    return updatedInfo;
}

/**
 * Derive a sorted list of messages from a set of messages.
 */
export function sortMessages(
    setStore: RemoteObject<ConversationMessageSetStore>,
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
