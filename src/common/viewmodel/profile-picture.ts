import type {IdColor} from '~/common/utils/id-color';

export type ProfilePictureShape = 'square' | 'circle';

/**
 * Data that is used for the avatar of a contact or group in case there is no profile picture.
 */
export interface ProfilePictureFallback {
    readonly color: IdColor;
    readonly initials: string;
}
