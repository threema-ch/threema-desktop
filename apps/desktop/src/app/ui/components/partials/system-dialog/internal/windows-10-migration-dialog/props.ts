import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {SystemDialogAction} from '~/common/system-dialog';

/**
 * Props accepted by the `Windows10MigrationDialog` component.
 */
export interface Windows10MigrationDialogProps extends Pick<ModalProps, 'onclose'> {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onselectaction?: (action: SystemDialogAction) => void;
}
