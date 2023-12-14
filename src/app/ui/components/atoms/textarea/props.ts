import type {Readable} from 'svelte/store';

/**
 * Props accepted by the `TextArea` component.
 */
export interface TextAreaProps {
    /** The behavior when pressing the enter key. Defaults to `"submit"`. */
    readonly enterKeyMode?: 'submit' | 'newline';
    /** Text to pre-fill when the `TextArea` is first rendered. */
    readonly initialText?: string;
    /** Readable state of whether or not the compose area is currently empty. */
    readonly isEmpty?: Readable<boolean>;
    /** Placeholder text to display when the `TextArea` is empty. */
    readonly placeholder: string;
}
