/**
 * Props accepted by the `Text` component.
 */
export interface TextProps {
    /** Where to align the text. Defaults to `"inherit"`. */
    readonly alignment?: 'inherit' | 'start' | 'center' | 'end';
    /** Color variant to use. Defaults to `"inherit"`. */
    readonly color?: 'mono-high' | 'mono-low' | 'mono-disabled' | 'inherit';
    /** Optional text decorations. Defaults to `"inherit"`. */
    readonly decoration?: 'strikethrough' | 'underline' | 'inherit';
    /**
     * Whether to replace cut off text with an ellipsis if this text element isn't allowed to wrap.
     * Defaults to `false`.
     */
    readonly ellipsis?: boolean;
    /** Font family variant to use. Defaults to `"inherit"`. */
    readonly family?: 'primary' | 'secondary' | 'inherit';
    /** Whether text is selectable. Defaults to `false`. */
    readonly selectable?: boolean;
    /** Font size. Defaults to `"inherit"`. */
    readonly size?:
        | 'h1'
        | 'h2'
        | 'h3'
        | 'h4'
        | 'h5'
        | 'h6'
        | 'body-large'
        | 'body'
        | 'body-small'
        | 'meta'
        | 'inherit';
    /** The text to render. */
    readonly text: string;
    /** Whether text should wrap. Defaults to `true`. */
    readonly wrap?: boolean;
}
