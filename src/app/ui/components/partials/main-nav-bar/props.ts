import type {AppServices} from '~/app/types';
import type {ProfilePictureView} from '~/common/model';

export interface MainNavBarProps {
    readonly profilePicture: ProfilePictureView;
    readonly initials: string;
    readonly services: AppServices;
}
