import type {AppServicesForSvelte} from '~/app/types';
import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `SystemDialog` component.
 */
export interface SystemDialogProps extends Pick<ModalProps, 'target'> {
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
}
