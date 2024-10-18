import type {AppServicesForSvelte} from '~/app/types';
import type {
    ContextMenuDivider,
    ContextMenuOption,
} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {ReceiverPreviewProps} from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/props';
import type {DbReceiverLookup} from '~/common/db';

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
    readonly highlights?: string | readonly string[];
    readonly items: ReceiverPreviewListItem<THandlerProps>[];
    readonly options?: {
        /**
         * Whether receivers whose conversation is currently open should be marked as active.
         * Defaults to `true`.
         */
        readonly highlightActiveReceiver?: boolean;
        /**
         * Whether to route to the respective receiver's conversation when it's clicked. Defaults to
         * `true`.
         */
        readonly routeOnClick?: boolean;
    };
    readonly services: Pick<AppServicesForSvelte, 'router' | 'settings' | 'profilePicture'>;

    /**
     * A function that is executed when the user clicks on an element in the receiver preview list.
     * This is useful if the click has asynchronous side-effects that need to be executed before
     * routing is triggered.
     */
    readonly onClickReceiverListElement?: (lookup: DbReceiverLookup) => Promise<void>;
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
    | ContextMenuDivider;

interface ContextMenuOptionWithHandlerProps<THandlerProps>
    extends Omit<ContextMenuOption, 'handler'> {
    readonly handler: (props: THandlerProps) => void;
}
