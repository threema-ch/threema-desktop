/**
 * Props accepted by the `Label` component.
 */
export interface LabelProps {
    /** The text to render. */
    text: string;
    /** Whether text should wrap. Defaults to `true`. */
    wrap?: boolean;
    /** Whether text is selectable. */
    selectable?: boolean;
}
