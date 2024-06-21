import type {RegularMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/props';

/**
 * Props accepted by the `MessageMediaViewerModal` component.
 */
export interface MessageMediaViewerModalProps {
    readonly file: Omit<NonNullable<RegularMessageProps['file']>, 'type'> & {
        readonly type: 'image' | 'video';
    };
}
