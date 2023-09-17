import type {ReadonlyUint8Array} from '~/common/types';
import type {IdColor} from '~/common/utils/id-color';

export type ProfilePictureShape = 'square' | 'circle';

export interface ProfilePictureData {
    readonly img: ReadonlyUint8Array | undefined;
    readonly color: IdColor;
    readonly initials: string;
}
