import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';

/**
 * Props accepted by the `MessageMediaViewerModal` component.
 */
export interface MessageMediaViewerModalProps {
    readonly file: Omit<NonNullable<MessageProps['file']>, 'type'> & {
        readonly type: 'image' | 'video';
    };
}
