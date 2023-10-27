import type {ProfilePictureColor} from '#3sc/components/threema/ProfilePicture';
import type {LazyImageProps} from '~/app/ui/components/atoms/lazy-image/props';
import type {u53} from '~/common/types';

/**
 * Props accepted by the `Avatar` component.
 */
export interface AvatarProps {
    /** Bytes of the avatar image. */
    readonly byteStore: LazyImageProps['byteStore'];
    /** Color used as the backdrop. */
    readonly color: ProfilePictureColor;
    /** Description of the avatar, used for accessibility. */
    readonly description: string;
    /** Fallback initials if the image is not provided or unavailable. */
    readonly initials: string;
    /** Size the avatar should render at. */
    readonly size: u53;
}
