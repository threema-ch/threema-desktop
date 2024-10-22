import type {AppServicesForSvelte} from '~/app/types';
import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {Delayed} from '~/common/utils/delayed';

export interface D2DProtocolVersionIncompatibleDialogProps extends Pick<ModalProps, 'target'> {
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
}
