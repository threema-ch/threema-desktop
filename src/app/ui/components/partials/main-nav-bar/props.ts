import type {AppServices} from '~/app/types';
import type {ProfilePictureView} from '~/common/model';

/**
 * Props accepted by the `MainNavBar` component.
 */
export interface MainNavBarProps {
    readonly profilePicture: ProfilePictureView;
    readonly initials: string;
    readonly services: AppServices;
}
