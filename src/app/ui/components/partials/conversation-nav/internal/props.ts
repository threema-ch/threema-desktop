import type {ProfilePictureView} from '~/common/model';

/**
 * Props accepted by the `TopBar` component.
 */
export interface TopBarProps {
    readonly profilePicture: ProfilePictureView;
    readonly initials: string;
}
