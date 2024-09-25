import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {AutoAppUpdateDownloadDialogContext} from '~/common/system-dialog';
import type {f64} from '~/common/types';

/**
 * Props accepted by the `AutoAppUpdateDownloadDialog` component.
 */
export interface AutoAppUpdateDownloadDialogProps
    extends Pick<ModalProps, 'target'>,
        AutoAppUpdateDownloadDialogContext {
    /**
     * Callback which is called when the download dialog is ready (i.e., progress has reached 100%,
     * animations are complete, etc.).
     */
    readonly onCompletion: () => void;
    /**
     * App update download progress.
     */
    readonly progress: f64;
}
