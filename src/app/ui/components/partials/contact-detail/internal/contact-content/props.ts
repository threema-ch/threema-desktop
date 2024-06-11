import type {AppServicesForSvelte} from '~/app/types';
import type {ContactReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ContactContent` component.
 */
export interface ContactContentProps {
    readonly receiver: ContactReceiverData;
    readonly services: Pick<AppServicesForSvelte, 'profilePicture' | 'settings'>;
}
