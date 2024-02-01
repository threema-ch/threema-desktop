import type {ProfilePictureColor} from '~/app/ui/svelte-components/threema/ProfilePicture';
import type {ReadonlyUint8Array} from '~/common/types';

/**
 * Props accepted by the `ProfileInfo` component.
 */
export interface ProfileInfoProps {
    readonly color: ProfilePictureColor;
    readonly displayName: string;
    readonly initials: string;
    readonly pictureBytes?: ReadonlyUint8Array;
}
