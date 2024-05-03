import type {AppServices} from '~/app/types';
import type {GroupReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `GroupContent` component.
 */
export interface GroupContentProps {
    readonly receiver: GroupReceiverData;
    readonly services: Pick<AppServices, 'router' | 'settings' | 'profilePicture'>;
}
