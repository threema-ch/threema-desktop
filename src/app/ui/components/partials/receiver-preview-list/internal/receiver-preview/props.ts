import type {AppServices} from '~/app/types';
import type {ContextMenuProviderProps} from '~/app/ui/components/hocs/context-menu-provider/props';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

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
    readonly receiver: AnyReceiverData;
    readonly services: Pick<AppServices, 'profilePicture' | 'router' | 'settings'>;
}
