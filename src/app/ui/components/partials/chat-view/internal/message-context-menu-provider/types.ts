export type MessageContextMenuItem = MessageContextMenuOption | 'divider';

interface MessageContextMenuOption {
    /**
     * Highlight color to use for the icon.
     */
    readonly color?: 'acknowledged' | 'declined' | 'default';
    /**
     * Whether the icon should be filled or outlined.
     */
    readonly filled?: boolean;
    /**
     * Handler function to run if this option is selected.
     */
    readonly handler: () => void;
    /**
     * Icon displayed next to the option's label.
     */
    readonly icon: string;
    /**
     * Text label to describe the option.
     */
    readonly label: string;
}
