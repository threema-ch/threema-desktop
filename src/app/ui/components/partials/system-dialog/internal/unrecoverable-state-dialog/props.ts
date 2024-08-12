import type {AppServicesForSvelte} from '~/app/types';
import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {SystemDialogAction} from '~/common/system-dialog';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `UnrecoverableStateDialog` component.
 */
export interface UnrecoverableStateDialogProps extends Pick<ModalProps, 'target'> {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onSelectAction?: (action: Extract<SystemDialogAction, 'dismissed'>) => void;
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
}
