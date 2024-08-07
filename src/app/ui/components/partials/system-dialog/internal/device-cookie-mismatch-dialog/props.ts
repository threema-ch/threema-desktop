import type {AppServicesForSvelte} from '~/app/types';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `DeviceCookieMismatchDialog` component.
 */
export interface DeviceCookieMismatchDialogProps {
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
}
