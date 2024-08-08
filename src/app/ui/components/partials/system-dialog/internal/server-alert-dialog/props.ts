import type {AppServicesForSvelte} from '~/app/types';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `ServerAlertDialog` component.
 */
export interface ServerAlertDialogProps {
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
    /**
     * The message of the server alert.
     */
    readonly text: string;
}
