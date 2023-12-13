import type {ProfilePictureColor} from '#3sc/components/threema/ProfilePicture';
import type {LazyImageProps} from '~/app/ui/components/atoms/lazy-image/props';
import type {u53} from '~/common/types';

/**
 * Props accepted by the `Avatar` component.
 */
export interface AvatarProps {
    /** Bytes of the avatar image. */
    readonly byteStore: LazyImageProps['byteStore'];
    /**
     * Additional options for the charm (slot), which will be placed on the circular avatar's edge
     * in a cutout.
     */
    readonly charm?: {
        /**
         * The position of the charm on the avatar's circle between 0 and 360 degrees. Defaults to
         * `135`.
         */
        readonly positionDegrees?: u53;
    };
    /** Color used as the backdrop. */
    readonly color: ProfilePictureColor;
    /** Description of the avatar, used for accessibility. */
    readonly description: string;
    /**
     * Whether clicking on the avatar should be disabled. Defaults to `false`.
     */
    readonly disabled?: boolean;
    /** Fallback initials if the image is not provided or unavailable. */
    readonly initials: string;
    /** Size the avatar should render at. */
    readonly size: u53;
}
