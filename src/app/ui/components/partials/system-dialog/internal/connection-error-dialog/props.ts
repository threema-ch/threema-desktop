import type {AppServicesForSvelte} from '~/app/types';
import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {ConnectionErrorDialogContext, SystemDialogAction} from '~/common/system-dialog';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `ConnectionErrorDialog` component.
 */
export interface ConnectionErrorDialogProps
    extends Pick<ModalProps, 'target'>,
        ConnectionErrorDialogContext {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onSelectAction?: (action: SystemDialogAction) => void;
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
}
