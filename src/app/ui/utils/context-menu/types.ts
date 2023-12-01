export type ContextMenuItem = ContextMenuOption | 'divider';

interface ContextMenuOption {
    /**
     * Handler function to run if this option is selected.
     */
    readonly handler: () => void;
    /**
     * Icon displayed next to the option's label.
     */
    readonly icon?: {
        readonly label: string;
        readonly color?: string;
        readonly filled?: boolean;
    };
    /**
     * Text label to describe the option.
     */
    readonly label: string;
}
