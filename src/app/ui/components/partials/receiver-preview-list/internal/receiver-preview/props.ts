import type {AppServices} from '~/app/types';
import type {ContextMenuProviderProps} from '~/app/ui/components/hocs/context-menu-provider/props';
import type {AnyReceiverDataOrSelf} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ReceiverPreview` component.
 */
export interface ReceiverPreviewProps {
    readonly active: boolean;
    readonly contextMenuOptions?: Omit<ContextMenuProviderProps, 'popover'>;
    /**
     * Optional substring(s) to highlight in conversation preview text fields.
     */
    readonly highlights?: string | string[];
    readonly popover?: ContextMenuProviderProps['popover'];
    /**
     * The `ReceiverData` to render as a preview. Note: If the receiver is self, the
     * `ReceiverPreview` will not be clickable.
     */
    readonly receiver: AnyReceiverDataOrSelf & {
        /**
         * Whether to display a special badge to show that this receiver is a group creator.
         */
        readonly isCreator?: boolean;
    };
    readonly services: Pick<AppServices, 'profilePicture' | 'router' | 'settings'>;
}
