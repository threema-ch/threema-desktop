import {type u53} from '~/common/types';
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
export function hasDirectionChanged(sortedMessagesParam: SortedMessageList, index: u53): boolean {
    if (index === 0) {
        return false;
    }

    const lastMessageDirection = sortedMessagesParam[index - 1].direction;
    const currentMessageDirection = sortedMessagesParam[index].direction;

    return lastMessageDirection !== currentMessageDirection;
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
