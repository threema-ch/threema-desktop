import type {ProseProps} from '~/app/ui/components/atoms/prose/props';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';

/**
 * Props accepted by the `Quote` component.
 */
export interface QuoteProps {
    /** Alt text for media previews, if needed. */
    readonly alt: MessageProps['alt'];
    /** Optional text content or caption of the message. */
    readonly content?: ProseProps['content'];
    /** Optional file data, if this is a file-based message. */
    readonly file?: MessageProps['file'];
    readonly onError: (error: Error) => void;
    /** Details about the message sender. */
    readonly sender?: MessageProps['sender'];
}
