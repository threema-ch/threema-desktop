import type {AppServices} from '~/app/types';
import type {ContextMenuOption} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {ReceiverPreviewProps} from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/props';

/**
 * Props accepted by the `ReceiverPreviewList` component.
 */
export interface ReceiverPreviewListProps<THandlerProps = undefined> {
    readonly contextMenuItems?:
        | ContextMenuItemWithHandlerProps<THandlerProps>[]
        | ((
              item: ReceiverPreviewListItem<THandlerProps>,
          ) => ContextMenuItemWithHandlerProps<THandlerProps>[]);
    /**
     * Optional substring(s) to highlight in receiver preview text fields.
     */
    readonly highlights?: string | string[];
    readonly items: ReceiverPreviewListItem<THandlerProps>[];
    readonly services: Pick<AppServices, 'router' | 'settings' | 'profilePicture'>;
}

export interface ReceiverPreviewListItem<THandlerProps>
    extends Omit<ReceiverPreviewProps, 'active' | 'contextMenuOptions' | 'services'> {
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
