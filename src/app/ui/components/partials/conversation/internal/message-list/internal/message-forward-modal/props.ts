import type {AppServicesForSvelte} from '~/app/types';
import type {RegularMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/props';
import type {DbReceiverLookup} from '~/common/db';

/**
 * Props accepted by the `MessageForwardModal` component.
 */
export interface MessageForwardModalProps {
    readonly id: RegularMessageProps['id'];
    readonly receiverLookup: DbReceiverLookup;
    readonly services: AppServicesForSvelte;
}
