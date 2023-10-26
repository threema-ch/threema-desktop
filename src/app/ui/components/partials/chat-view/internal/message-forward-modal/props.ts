import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {DbReceiverLookup} from '~/common/db';

/**
 * Props accepted by the `MessageForwardModal` component.
 */
export interface MessageForwardModalProps {
    readonly id: MessageProps['id'];
    readonly receiverLookup: DbReceiverLookup;
    readonly services: AppServices;
}