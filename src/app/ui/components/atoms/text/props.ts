/**
 * Props accepted by the `Text` component.
 */
export interface TextProps {
    /** The text to render. */
    text: string;
    /** Whether text should wrap. Defaults to `true`. */
    wrap?: boolean;
    /** Whether text is selectable. */
    selectable?: boolean;
}
