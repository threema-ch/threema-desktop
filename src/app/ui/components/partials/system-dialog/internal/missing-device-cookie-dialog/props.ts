import type {AppServicesForSvelte} from '~/app/types';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `MissingDeviceCookieDialog` component.
 */
export interface MissingDeviceCookieDialogProps {
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
}
