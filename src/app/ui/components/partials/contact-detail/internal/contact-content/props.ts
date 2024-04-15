import type {AppServices} from '~/app/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ContactContent` component.
 */
export interface ContactContentProps {
    readonly receiver: AnyReceiverData & {readonly type: 'contact'};
    readonly services: Pick<AppServices, 'profilePicture' | 'settings'>;
}
