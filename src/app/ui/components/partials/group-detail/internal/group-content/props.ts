import type {AppServicesForSvelte} from '~/app/types';
import type {DbReceiverLookup} from '~/common/db';
import type {GroupReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `GroupContent` component.
 */
export interface GroupContentProps {
    readonly receiver: GroupReceiverData;
    readonly services: Pick<AppServicesForSvelte, 'router' | 'settings' | 'profilePicture'>;
    readonly handleClickGroupMember: (lookup: DbReceiverLookup) => Promise<void>;
}
