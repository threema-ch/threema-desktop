import type {AppServices} from '~/app/types';
import type {ContextMenuOption} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {ConversationPreviewProps} from '~/app/ui/components/partials/conversation-preview-list/internal/conversation-preview/props';

/**
 * Props accepted by the `ConversationPreviewList` component.
 */
export interface ConversationPreviewListProps<THandlerProps = undefined> {
    readonly contextMenuItems?:
        | ContextMenuItemWithHandlerProps<THandlerProps>[]
        | ((
              item: ConversationPreviewListItem<THandlerProps>,
          ) => ContextMenuItemWithHandlerProps<THandlerProps>[]);
    /**
     * Optional substring(s) to highlight in conversation preview text fields.
     */
    readonly highlights?: string | string[];
    readonly items: ConversationPreviewListItem<THandlerProps>[];
    readonly services: AppServices;
}

export interface ConversationPreviewListItem<THandlerProps>
    extends Omit<ConversationPreviewProps, 'active' | 'contextMenuOptions' | 'services'> {
    /**
     * Additional data belonging to a list item, which will be passed to to each context menu item
     * handler callback.
     */
    readonly handlerProps: THandlerProps;
}

export type ContextMenuItemWithHandlerProps<THandlerProps> =
    | ContextMenuOptionWithHandlerProps<THandlerProps>
    | 'divider';

interface ContextMenuOptionWithHandlerProps<THandlerProps>
    extends Omit<ContextMenuOption, 'handler'> {
    readonly handler: (props: THandlerProps) => void;
}
