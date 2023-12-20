import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';

/**
 * Props accepted by the `KeyValueList.ItemWithDropdown` component.
 */
export interface ItemWithDropdownProps {
    readonly items: ContextMenuItem[];
    /**
     * The key of the list item. Note: Will be used as the title.
     */
    readonly key: string;
    readonly options?: {
        readonly showInfoIcon?: boolean;
        readonly disabled?: boolean;
    };
}
