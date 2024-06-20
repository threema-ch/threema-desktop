import type {AppServicesForSvelte} from '~/app/types';
import type {AvatarCharm} from '~/app/ui/components/atoms/avatar/props';
import type {u53} from '~/common/types';
import type {
    AnyReceiverData,
    ContactReceiverData,
    SelfReceiverData,
} from '~/common/viewmodel/utils/receiver';

export type ProfilePictureReceiverData =
    | (Pick<AnyReceiverData, 'color' | 'initials' | 'lookup' | 'name' | 'type'> &
          Pick<ContactReceiverData, 'badge'>)
    | Pick<SelfReceiverData, 'color' | 'initials' | 'name' | 'type'>;

/**
 * Props accepted by the `ProfilePicture` component.
 */
export interface ProfilePictureProps {
    /**
     * Additional charms to add to the profile picture.
     */
    readonly extraCharms?: AvatarCharm[];
    readonly options?: {
        /**
         * Whether to hide all charms that would be automatically added, based on the receiver's
         * data (e.g., app flavor indicator or unread count indicator). Defaults to `false`.
         */
        readonly hideDefaultCharms?: boolean;
        /**
         * Whether the `ProfilePicture` is clickable and should emit `on:click` events. Defaults to
         * `false`.
         */
        readonly isClickable?: boolean;
        /**
         * Whether the `ProfilePicture` is focusable (usually with the `Tab` key). Defaults to
         * `false`. Note: Doesn't have any effect if `isClickable` is set to `false`.
         */
        readonly isFocusable?: boolean;
    };
    /** Receiver to render a `ProfilePicture` for. */
    readonly receiver:
        | (Pick<AnyReceiverData, 'color' | 'initials' | 'lookup' | 'name' | 'type'> &
              Pick<ContactReceiverData, 'badge'>)
        | Pick<SelfReceiverData, 'color' | 'initials' | 'name' | 'type'>;
    readonly services: Pick<AppServicesForSvelte, 'profilePicture'>;
    /** Controls how large the avatar, text, and other elements appear. Defaults to `"md"`. */
    readonly size?: 'lg' | 'md' | 'sm';
    /**
     * Count of unread messages in the conversation with the respective receiver, to be displayed in
     * a badge. Defaults to `0`. Note: If the count is `undefined` or `0`, no charm will be
     * displayed for the message count.
     */
    readonly unreadMessageCount?: u53;
}
