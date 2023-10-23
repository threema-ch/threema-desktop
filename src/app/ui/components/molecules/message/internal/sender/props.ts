import type {ProfilePictureColor} from '#3sc/components/threema/ProfilePicture';

/**
 * Props accepted by the `Sender` component.
 */
export interface SenderProps {
    /**
     * Deterministic color of this sender used to color the name.
     */
    readonly color: ProfilePictureColor;
    /** Full name of the sender. */
    readonly name: string;
}
