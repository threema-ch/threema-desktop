import type {AppServicesForSvelte} from '~/app/types';
import type {GroupReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `EveryoneMentionListItem` component.
 */
export interface EveryoneMentionListItemProps {
    readonly receiver: GroupReceiverData;
    readonly services: Pick<AppServicesForSvelte, 'profilePicture'>;
}
