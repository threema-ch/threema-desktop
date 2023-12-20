/**
 * Props accepted by the `KeyValueList.ItemWithSwitch` component.
 */
export interface ItemWithSwitchProps {
    readonly checked?: boolean;
    readonly disabled?: boolean;
    /**
     * The key of the list item. Note: Will be used as the title.
     */
    readonly key: string;
    readonly options?: {
        readonly showInfoIcon?: boolean;
    };
}
