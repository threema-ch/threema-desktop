import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {AppUpdateDialogContext, SystemDialogAction} from '~/common/system-dialog';

/**
 * Props accepted by the `AppUpdateDialog` component.
 */
export interface AppUpdateDialogProps extends Pick<ModalProps, 'target'>, AppUpdateDialogContext {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onSelectAction?: (action: Extract<SystemDialogAction, 'dismissed'>) => void;
}
