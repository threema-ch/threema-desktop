/**
 * Props accepted by the `FocusMoverProvider` component.
 */
export interface FocusMoverProviderProps {
    /**
     * Name of the key to listen for to move focus to the next item. Defaults to `"ArrowDown"`.
     */
    readonly nextKey?: string;
    /**
     * Name of the key to listen for to move focus to the previous item. Defaults to `"ArrowUp"`.
     */
    readonly previousKey?: string;
}
