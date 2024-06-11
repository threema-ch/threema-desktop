import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
import type {DbReceiverLookup} from '~/common/db';

/**
 * Props accepted by the `MessageForwardModal` component.
 */
export interface MessageForwardModalProps {
    readonly id: MessageProps['id'];
    readonly receiverLookup: DbReceiverLookup;
    readonly services: AppServicesForSvelte;
}
