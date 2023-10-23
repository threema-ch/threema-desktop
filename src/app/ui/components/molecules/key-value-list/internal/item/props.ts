/**
 * Props accepted by the `Item` component.
 */
export interface ItemProps {
    /**
     * The key of the list item. Note: Will be used as the title.
     */
    readonly key: string;
    readonly options?: {
        readonly showInfoIcon?: boolean;
    };
}
