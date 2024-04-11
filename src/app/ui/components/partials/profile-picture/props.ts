import type {AppServices} from '~/app/types';
import type {u53} from '~/common/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ProfilePicture` component.
 */
export interface ProfilePictureProps {
    readonly options?: {
        /**
         * Whether the `ProfilePicture` is clickable and should emit `on:click` events. Defaults to
         * `false`.
         */
        isClickable?: boolean;
    };
    /** Receiver to render a `ProfilePicture` for. */
    readonly receiver: Pick<AnyReceiverData, 'color' | 'initials' | 'lookup' | 'name'> &
        Pick<AnyReceiverData & {type: 'contact'}, 'badge'>;
    readonly services: Pick<AppServices, 'profilePicture'>;
    /** Controls how large the avatar, text, and other elements appear. Defaults to `"md"`. */
    readonly size?: 'lg' | 'md' | 'sm';
    /**
     * Count of unread messages in the conversation with the respective receiver, to be displayed in
     * a badge. Defaults to `0`. Note: If the count is `undefined` or `0`, no charm will be
     * displayed for the message count.
     */
    readonly unreadMessageCount?: u53;
}
