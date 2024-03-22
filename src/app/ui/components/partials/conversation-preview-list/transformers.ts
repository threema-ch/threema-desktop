import type {ConversationPreviewProps} from '~/app/ui/components/partials/conversation-preview-list/internal/conversation-preview/props';
import type {ConversationPreviewListProps} from '~/app/ui/components/partials/conversation-preview-list/props';
import type {u53} from '~/common/types';

/**
 * Transforms `contextMenuItems` of a `ConversationPreviewList` to `contextMenuOptions` assignable
 * to a `ContextMenuProvider`. Wraps the handler callback to inject additional `handlerProps`.
 */
export function transformContextMenuItemsToContextMenuOptions<THandlerProps>(
    conversationPreviewListItem: ConversationPreviewListProps<THandlerProps>['items'][u53],
    contextMenuItems: ConversationPreviewListProps<THandlerProps>['contextMenuItems'],
): NonNullable<ConversationPreviewProps['contextMenuOptions']> {
    if (contextMenuItems === undefined) {
        // Return an empty array of items, so that the context menu won't be rendered at all.
        return {items: []};
    }

    // If `contextMenuItems` is a function, pass in `conversationPreviewListItem` to lazily evaluate
    // the context menu items.
    if (typeof contextMenuItems === 'function') {
        // Recursively pass the result to this function again to wrap the handlers.
        return transformContextMenuItemsToContextMenuOptions(
            conversationPreviewListItem,
            contextMenuItems(conversationPreviewListItem),
        );
    }

    return {
        items: contextMenuItems.map((item) => {
            if (item === 'divider') {
                return item;
            }

            return {
                ...item,
                handler: () => {
                    item.handler(conversationPreviewListItem.handlerProps);
                },
            };
        }),
    };
}
