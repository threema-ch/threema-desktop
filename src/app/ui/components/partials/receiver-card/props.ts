import type {ProfilePictureProps} from '~/app/ui/components/partials/profile-picture/props';
import type {ContentItemProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/props';

/**
 * Props accepted by the `ReceiverCard` component.
 */
export interface ReceiverCardProps {
    /**
     * Additional content to render next to the avatar.
     */
    readonly content?: {
        readonly topLeft?: ContentItemProps['options'][];
        readonly topRight?: ContentItemProps['options'][];
        readonly bottomLeft?: ContentItemProps['options'][];
        readonly bottomRight?: ContentItemProps['options'][];
    };
    readonly options?: {
        /**
         * Whether the `ReceiverCard` is clickable and should emit `on:click` events. Defaults to
         * `false`.
         */
        readonly isClickable?: boolean;
        /**
         * Whether the `ReceiverCard` is focusable (usually with the `Tab` key). Defaults to
         * `false`. Note: Doesn't have any effect if `isClickable` is set to `false`.
         */
        readonly isFocusable?: boolean;
    };
    /** Receiver to render a `ReceiverCard` for. */
    readonly receiver: ProfilePictureProps['receiver'];
    readonly services: ProfilePictureProps['services'];
    /** Controls how large the avatar, text, and other elements appear. Defaults to `"md"`. */
    readonly size?: ProfilePictureProps['size'];
    /**
     * Count of unread messages in the conversation with the respective receiver, to be displayed in
     * a badge. Defaults to `0`.
     */
    readonly unreadMessageCount?: ProfilePictureProps['unreadMessageCount'];
}
