/**
 * Props accepted by the `LazyList` component.
 */
export interface LazyListProps<TId, TProps> {
    /** Items to render as part of the `LazyList`. */
    readonly items: LazyListItemProps<TId, TProps>[];
    /** The `id` of the last item in the list. */
    readonly lastItemId: TId | undefined;
    /** The `id` of the message that should be visible. */
    readonly initiallyVisibleItemId?: TId;
}

/**
 * Extension of component props with unique `id`.
 */
export type LazyListItemProps<TId, TProps> = {
    readonly id: TId;
} & TProps;
