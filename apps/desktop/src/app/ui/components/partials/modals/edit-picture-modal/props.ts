import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {ProfilePictureColor} from '~/app/ui/svelte-components/threema/ProfilePicture';

export interface EditPictureModalProps extends Pick<ModalProps, 'onclose'> {
    readonly title: string;
    readonly color: ProfilePictureColor;
    /** Fallback placeholder if the image is not provided or unavailable. */
    readonly placeholder:
        | {readonly type: 'initials'; readonly initials: string}
        | {readonly type: 'icon'; readonly name: string};
    readonly blob?: Blob;
    readonly onsubmit: (img: Blob | undefined) => Promise<void>;
}
