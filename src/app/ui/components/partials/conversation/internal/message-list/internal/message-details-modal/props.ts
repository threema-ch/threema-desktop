import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
import type {StatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/props';
import type {MessageId, StatusMessageId} from '~/common/network/types';

/**
 * Props accepted by the `MessageDetailsModal` component.
 */
export interface MessageDetailsModalProps {
    readonly conversation: MessageProps['conversation'];
    readonly direction?: MessageProps['direction'];
    readonly file?: MessageProps['file'];
    readonly id?: MessageId | StatusMessageId;
    readonly reactions: readonly Reaction[];
    readonly history: readonly HistoryEntry[];
    readonly services: AppServicesForSvelte;
    readonly status: MessageProps['status'];
    readonly statusMessageType?: StatusMessageProps['status']['type'];
}

interface Reaction {
    readonly at: Date;
    readonly direction: 'inbound' | 'outbound';
    readonly sender: {
        readonly name: string;
    };
    readonly type: 'acknowledged' | 'declined';
}

interface HistoryEntry {
    readonly at: Date;
    readonly text: string;
}
