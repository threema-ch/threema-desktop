import type {ProfilePictureColor} from '#3sc/components/threema/ProfilePicture';
import type {ReadonlyUint8Array} from '~/common/types';

/**
 * Props accepted by the `ProfilePictureModal` component.
 */
export interface ProfilePictureModalProps {
    readonly alt: string;
    readonly color: ProfilePictureColor;
    readonly initials: string;
    readonly pictureBytes?: ReadonlyUint8Array;
}
