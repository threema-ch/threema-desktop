import type {MessageProps} from '~/app/ui/components/molecules/message/props';

/**
 * Props accepted by the `Bubble` component.
 */
export interface BubbleProps extends Pick<MessageProps, 'direction'> {
    /** The size of the padding between the bubble and its content. */
    padding?: 'normal' | 'thin';
}
