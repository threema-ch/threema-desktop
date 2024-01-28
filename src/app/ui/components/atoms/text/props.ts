/**
 * Props accepted by the `Text` component.
 */
export interface TextProps {
    /** Color variant to use. Defaults to `"inherit"`. */
    readonly color?: 'mono-high' | 'mono-low' | 'mono-disabled' | 'inherit';
    /** Optional text decorations. Defaults to `"inherit"`. */
    readonly decoration?: 'strikethrough' | 'underline' | 'inherit';
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
