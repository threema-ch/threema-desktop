import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';

import type {ProfilePictureColor} from '~/app/ui/svelte-components/threema/ProfilePicture';

/**
 * Props accepted by the `ProfileInfo` component.
 */
export interface ProfileInfoProps {
    readonly color: ProfilePictureColor;
    readonly displayName: string;
    readonly initials: string;
    readonly pictureBytes?: ReadonlyUint8Array;
    readonly onclickprofilepicture?: (event: MouseEvent) => void;
    readonly updateProfilePicture: (img: Blob | undefined) => Promise<void>;
}
