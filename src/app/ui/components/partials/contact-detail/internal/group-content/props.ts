import type {AppServices} from '~/app/types';
import type {AnyReceiverData, AnyReceiverDataOrSelf} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `GroupContent` component.
 */
export interface GroupContentProps {
    readonly receiver: AnyReceiverData & {readonly type: 'group'};
    readonly services: Pick<AppServices, 'router' | 'settings' | 'profilePicture'>;
    readonly user: AnyReceiverDataOrSelf & {readonly type: 'self'};
}
