import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';

/**
 * Props accepted by the `MessageDetailsModal` component.
 */
export interface MessageDetailsModalProps {
    readonly conversation: MessageProps['conversation'];
    readonly direction: MessageProps['direction'];
    readonly file?: MessageProps['file'];
    readonly id: MessageProps['id'];
    readonly reactions: Readonly<Reaction[]>;
    readonly services: AppServices;
    readonly status: MessageProps['status'];
}

interface Reaction {
    readonly at: Date;
    readonly direction: 'inbound' | 'outbound';
    readonly sender: {
        readonly name: string;
    };
    readonly type: 'acknowledged' | 'declined';
}
