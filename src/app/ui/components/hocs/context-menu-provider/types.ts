/**
 * Single item in a context menu. Either it's a {@link ContextMenuOption} or a "divider" (to create
 * distinct sections of options).
 */
export type ContextMenuItem = ContextMenuOption | 'divider';

/**
 * An interactive option that is part of a context menu.
 */
export interface ContextMenuOption {
    /**
     * Whether to display the menu option as disabled. Note: "pseudo" will look similar to a
     * disabled item, but will still be clickable.
     */
    readonly disabled?: boolean | 'pseudo';
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
