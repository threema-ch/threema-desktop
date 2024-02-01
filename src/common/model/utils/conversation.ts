import {ConversationVisibility} from '~/common/enum';
import type {ConversationView} from '~/common/model/types/conversation';
import type {u53} from '~/common/types';

/**
 * Returns the optimal order of the given conversations `a` and `b`. Usable to use as the
 * `compareFn` for {@link Array.prototype.sort()}.
 */
export function conversationCompareFn(
    a: Pick<ConversationView, 'lastUpdate' | 'visibility'>,
    b: Pick<ConversationView, 'lastUpdate' | 'visibility'>,
): u53 {
    // Move pinned conversation to top.
    const aIsPinned = a.visibility === ConversationVisibility.PINNED;
    const bIsPinned = b.visibility === ConversationVisibility.PINNED;
    if (aIsPinned && !bIsPinned) {
        return -1;
    }
    if (!aIsPinned && bIsPinned) {
        return 1;
    }

    // Move archived conversation to bottom.
    const aIsArchived = a.visibility === ConversationVisibility.ARCHIVED;
    const bIsArchived = b.visibility === ConversationVisibility.ARCHIVED;
    if (aIsArchived && !bIsArchived) {
        return 1;
    }
    if (!aIsArchived && bIsArchived) {
        return -1;
    }

    // Sort by lastUpdate.
    const aTime = a.lastUpdate?.getTime();
    const bTime = b.lastUpdate?.getTime();
    if (aTime !== undefined && bTime !== undefined) {
        return bTime - aTime;
    }
    if (aTime !== undefined && bTime === undefined) {
        return -1;
    }
    if (aTime === undefined && bTime !== undefined) {
        return 1;
    }

    // Else, keep the current order.
    return 0;
}
