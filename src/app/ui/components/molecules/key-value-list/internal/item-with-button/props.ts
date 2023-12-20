/**
 * Props accepted by the `KeyValueList.ItemWithButton` component.
 */
export interface ItemWithButtonProps {
    readonly icon: string;
    /**
     * The key of the list item. Note: Will be used as the title.
     */
    readonly key: string;
    readonly options?: {
        readonly showInfoIcon?: boolean;
        readonly disabled?: boolean;
    };
}
