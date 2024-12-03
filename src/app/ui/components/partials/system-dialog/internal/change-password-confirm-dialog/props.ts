import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {SystemDialogAction} from '~/common/system-dialog';

/**
 * Props accepted by the `ChangePasswordConfirmDialog` component.
 */
export interface ChangePasswordConfirmDialogProps extends Pick<ModalProps, 'target'> {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onSelectAction?: (action: SystemDialogAction) => void;
}
