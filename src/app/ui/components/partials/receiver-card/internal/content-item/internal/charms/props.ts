import type {AnyCallData} from '~/common/viewmodel/utils/call';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `Charms` component.
 */
export interface CharmsProps {
    readonly call?: AnyCallData;
    readonly isBlocked?: boolean;
    readonly isPinned?: boolean;
    readonly isPrivate?: boolean;
    readonly notificationPolicy?: AnyReceiverData['notificationPolicy'];
}
