/**
 * Single item in a context menu. Either it's a {@link ContextMenuOption} or a "divider" (to create
 * distinct sections of options).
 */
export type ContextMenuItem = ContextMenuOption | 'divider';

/**
 * An interactive option that is part of a context menu.
 */
export interface ContextMenuOption {
    readonly disabled?: boolean;
    /**
     * Handler function to run if this option is selected.
     */
    readonly handler: () => void;
    /**
     * Icon displayed next to the option's label.
     */
    readonly icon?: {
        readonly name: string;
        readonly color?: 'acknowledged' | 'declined' | 'default';
        readonly filled?: boolean;
    };
    /**
     * Text label to describe the option.
     */
    readonly label: string;
}
