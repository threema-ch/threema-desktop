import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
import type {IdentityStringOrMe} from '~/common/model/types/message';

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
        // We keep the indentity here to have a clear distinction in case somebody has the display
        // name `"me"`.
        identity: IdentityStringOrMe;
        name?: string;
    };
    readonly type: 'acknowledged' | 'declined';
}