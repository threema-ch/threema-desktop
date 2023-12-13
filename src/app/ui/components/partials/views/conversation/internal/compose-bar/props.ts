/**
 * Props accepted by the `ComposeBar` component.
 */
export interface ComposeBarProps {
    readonly options?: {
        /** Whether to show a button to attach files. Defaults to `true`. */
        readonly showAttachFilesButton?: boolean;
    };
}
