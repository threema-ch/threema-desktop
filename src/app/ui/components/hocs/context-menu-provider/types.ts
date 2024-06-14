/**
 * Single item in a context menu. Either it's a {@link ContextMenuOption} or a "divider" (to create
 * distinct sections of options).
 */
export type ContextMenuItem<THandlerProps = undefined> =
    | ContextMenuOption<THandlerProps>
    | 'divider';

/**
 * An interactive option that is part of a context menu.
 */
export type ContextMenuOption<THandlerProps = undefined> = THandlerProps extends undefined
    ? ContextMenuOptionWithoutHandlerProps
    : ContextMenuOptionWithHandlerProps<THandlerProps>;

interface ContextMenuOptionWithoutHandlerProps {
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

interface ContextMenuOptionWithHandlerProps<THandlerProps>
    extends Omit<ContextMenuOptionWithoutHandlerProps, 'handler'> {
    /**
     * Handler function to run if this option is selected.
     */
    readonly handler: (props: THandlerProps) => void;
    /**
     * Additional data passed to the handler callback.
     */
    readonly handlerProps: THandlerProps;
}
