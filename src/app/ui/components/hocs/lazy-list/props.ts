/**
 * Props accepted by the `LazyList` component.
 */
export interface LazyListProps<TId, TProps> {
    /** Items to render as part of the `LazyList`. */
    readonly items: LazyListItemProps<TId, TProps>[];
    /** Callback to handle errors that are caught in `LazyList`. */
    readonly onError?: (error: Error) => void;
    /**
     * The id of the item that the visible area should be scrolled to. Note: Whenever this value
     * changes, the respective item will be made visible again (jumping to it if necessary).
     */
    readonly visibleItemId?: TId;
}

/**
 * Extension of component props with unique `id`.
 */
export type LazyListItemProps<TId, TProps> = {
    readonly id: TId;
} & TProps;
