import type {AppServicesForSvelte} from '~/app/types';
import type {
    ContextMenuDivider,
    ContextMenuOption,
} from '~/app/ui/components/hocs/context-menu-provider/types';
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
    readonly highlights?: string | readonly string[];
    readonly items: ConversationPreviewListItem<THandlerProps>[];
    readonly services: AppServicesForSvelte;
}

export interface ConversationPreviewListItem<THandlerProps>
    extends Omit<ConversationPreviewProps, 'active' | 'contextMenuOptions' | 'services'> {
    /**
     * Additional data which the component will pass to callbacks (e.g., events or context menu
     * clicks).
     */
    readonly handlerProps: THandlerProps;
}

export type ContextMenuItemWithHandlerProps<THandlerProps> =
    | ContextMenuOptionWithHandlerProps<THandlerProps>
    | ContextMenuDivider;

interface ContextMenuOptionWithHandlerProps<THandlerProps>
    extends Omit<ContextMenuOption, 'handler'> {
    readonly handler: (props: THandlerProps) => void;
}
