import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {IdentityString} from '~/common/network/types';

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
    readonly reactionSender: {
        // We keep the indentity here to have a clear distinction
        // In case somebody has the display name 'me'
        identity: IdentityString | 'me';
        name: string;
    };
    readonly type: 'acknowledged' | 'declined';
}
