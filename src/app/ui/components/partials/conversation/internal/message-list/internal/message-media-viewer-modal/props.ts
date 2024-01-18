import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';

/**
 * Props accepted by the `MessageMediaViewerModal` component.
 */
export interface MessageMediaViewerModalProps {
    readonly file: Omit<NonNullable<MessageProps['file']>, 'type'> & {
        readonly type: 'image' | 'video';
    };
}
