import type {AppServicesForSvelte} from '~/app/types';
import type {RegularMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/props';
import type {StatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/props';
import type {SanitizedHtml} from '~/app/ui/utils/text';
import type {MessageId, StatusMessageId} from '~/common/network/types';

/**
 * Props accepted by the `MessageDetailsModal` component.
 */
export interface MessageDetailsModalProps {
    readonly conversation: RegularMessageProps['conversation'];
    readonly direction?: RegularMessageProps['direction'];
    readonly file?: RegularMessageProps['file'];
    readonly id?: MessageId | StatusMessageId;
    readonly reactions: readonly Reaction[];
    readonly history: readonly HistoryEntry[];
    readonly services: AppServicesForSvelte;
    readonly status: RegularMessageProps['status'];
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
    // Sanitized html of the history's text. Is undefined if the history entry describes an empty caption.
    readonly text: SanitizedHtml | undefined;
}
