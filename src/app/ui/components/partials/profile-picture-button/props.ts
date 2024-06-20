import type {AppServicesForSvelte} from '~/app/types';
import type {ContactReceiverData, SelfReceiverData} from '~/common/viewmodel/utils/receiver';

export type ProfilePictureReceiverData =
    | Pick<ContactReceiverData, 'color' | 'initials' | 'lookup' | 'name' | 'type'>
    | Pick<SelfReceiverData, 'color' | 'initials' | 'name' | 'type'>;

/**
 * Props accepted by the `ProfilePictureButton` component.
 */
export interface ProfilePictureButtonProps {
    /**
     * Name of the icon to render.
     */
    readonly icon: string;
    /**
     * Button text to render.
     */
    readonly label: string;
    /**
     * List of receivers to render profile pictures for (as part of the button).
     *
     * Note: If there are too many and they don't fit into the layout, a `+N` badge will be shown to
     * represent the number of profile pictures that could not be displayed.
     */
    readonly receivers: readonly ProfilePictureReceiverData[];
    readonly services: Pick<AppServicesForSvelte, 'profilePicture'>;
}
