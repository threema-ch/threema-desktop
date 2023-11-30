/**
 * Props accepted by the `Text` component.
 */
export interface TextProps {
    /** Color variant to use. Defaults to `"mono"`. */
    readonly color?: 'primary' | 'mono';
    /** Emphasis (i.e. opacity) of the color. Defaults to `"high"`. */
    readonly emphasis?: 'high' | 'low' | 'disabled';
    /** Font family variant to use. Defaults to `"secondary"`. */
    readonly family?: 'primary' | 'secondary';
    /** Whether text is selectable. */
    readonly selectable?: boolean;
    /** Font size. Defaults to `"body"`. */
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
        | 'meta';
    /** The text to render. */
    readonly text: string;
    /** Whether text should wrap. Defaults to `true`. */
    readonly wrap?: boolean;
}
