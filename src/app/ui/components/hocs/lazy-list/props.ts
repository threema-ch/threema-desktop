/**
 * Props accepted by the `LazyList` component.
 * Note: The element must have a unique ID that is unique over the whole list.
 */
export interface LazyListProps<TProps extends {readonly id: unknown}> {
    /** Items to render as part of the `LazyList`. */
    readonly items: TProps[];
    /** Callback to handle errors that are caught in `LazyList`. */
    readonly onError?: (error: Error) => void;
    /**
     * The id of the item that the visible area should be scrolled to. Note: Whenever this value
     * changes, the respective item will be made visible again (jumping to it if necessary).
     */
    readonly visibleItemId?: TProps['id'];
}
