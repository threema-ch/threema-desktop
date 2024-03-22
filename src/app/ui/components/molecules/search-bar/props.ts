/**
 * Props accepted by the `SearchBar` component.
 */
export interface SearchBarProps {
    /** Callback for the `SearchBar` to request a refresh of results. */
    readonly onRequestRefresh?: () => void;
    /** Placeholder to display when `term` is missing or empty. */
    readonly placeholder?: string;
    /** Search taerm. */
    readonly term?: string;
}
