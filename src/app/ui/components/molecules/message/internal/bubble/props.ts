import type {MessageProps} from '~/app/ui/components/molecules/message/props';

/**
 * Props accepted by the `Bubble` component.
 */
export interface BubbleProps extends Pick<MessageProps, 'direction'> {
    /**
     * Whether to play an animation to bring attention to the bubble. Resets to `false` when the
     * animation is completed.
     */
    readonly highlighted?: boolean;
    /** The size of the padding between the bubble and its content. */
    readonly padding?: 'normal' | 'thin';
}
