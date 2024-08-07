import type {AppServicesForSvelte} from '~/app/types';
import type {ThreemaWorkCredentials} from '~/common/device';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Props accepted by the `InvalidWorkCredentialsDialog` component.
 */
export interface InvalidWorkCredentialsDialogProps {
    readonly services: Delayed<Pick<AppServicesForSvelte, 'backend'>>;
    /**
     * The current work credentials.
     */
    readonly workCredentials: ThreemaWorkCredentials;
}
