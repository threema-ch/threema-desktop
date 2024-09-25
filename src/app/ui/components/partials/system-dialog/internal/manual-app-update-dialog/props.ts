import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {ManualAppUpdateDialogContext, SystemDialogAction} from '~/common/system-dialog';

/**
 * Props accepted by the `ManualAppUpdateDialog` component.
 */
export interface ManualAppUpdateDialogProps
    extends Pick<ModalProps, 'target'>,
        ManualAppUpdateDialogContext {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onSelectAction?: (action: Extract<SystemDialogAction, 'dismissed'>) => void;
}
