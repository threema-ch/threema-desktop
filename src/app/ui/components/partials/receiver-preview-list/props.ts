import type {AppServices} from '~/app/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ReceiverPreviewList` component.
 */
export interface ReceiverPreviewListProps {
    readonly items: ReceiverPreviewListItemProps[];
    readonly services: AppServices;
}

interface ReceiverPreviewListItemProps {
    readonly receiver: AnyReceiverData;
}
