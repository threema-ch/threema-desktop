/**
 * Props accepted by the `ComposeBar` component.
 */
export interface ComposeBarProps {
    /**
     * The mode of the compose bar. Defaults to insert.
     */
    readonly mode: 'edit' | 'insert';
    readonly options?: {
        /** Whether to show a button to attach files. Defaults to `true`. */
        readonly showAttachFilesButton?: boolean;
    };
}
