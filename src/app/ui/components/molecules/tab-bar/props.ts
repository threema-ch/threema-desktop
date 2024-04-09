/**
 * Props accepted by the `TabBar` component.
 */
export interface TabBarProps<TId> {
    readonly tabs: Tab<TId>[];
}

interface Tab<TId> {
    readonly disabled?: boolean;
    readonly id: TId;
    readonly icon?: string;
    readonly onClick?: (id: TId) => void;
}
