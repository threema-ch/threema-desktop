import type {ReceiverPreviewProps} from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/props';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {u53} from '~/common/types';

/**
 * Transforms `contextMenuItems` of a `ReceiverPreviewList` to `contextMenuOptions` assignable to a
 * `ContextMenuProvider`. Wraps the handler callback to inject additional `handlerProps`.
 */
export function transformContextMenuItemsToContextMenuOptions<THandlerProps>(
    receiverPreviewListItem: ReceiverPreviewListProps<THandlerProps>['items'][u53],
    contextMenuItems: ReceiverPreviewListProps<THandlerProps>['contextMenuItems'],
): NonNullable<ReceiverPreviewProps['contextMenuOptions']> {
    if (contextMenuItems === undefined) {
        // Return an empty array of items, so that the context menu won't be rendered at all.
        return {items: []};
    }

    // If `contextMenuItems` is a function, pass in `receiverPreviewListItem` to lazily evaluate
    // the context menu items.
    if (typeof contextMenuItems === 'function') {
        // Recursively pass the result to this function again to wrap the handlers.
        return transformContextMenuItemsToContextMenuOptions(
            receiverPreviewListItem,
            contextMenuItems(receiverPreviewListItem),
        );
    }

    return {
        items: contextMenuItems.map((item) => {
            if (item.type === 'divider') {
                return item;
            }

            return {
                ...item,
                handler: () => {
                    item.handler(receiverPreviewListItem.handlerProps);
                },
            };
        }),
    };
}
