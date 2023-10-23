import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';

/**
 * Props accepted by the `MessageDetailsModal` component.
 */
export interface MessageDetailsModalProps {
    readonly direction: MessageProps['direction'];
    readonly file?: MessageProps['file'];
    readonly id: MessageProps['id'];
    readonly reactions: MessageProps['reactions'];
    readonly status: MessageProps['status'];
}
