import {type ReadonlyUint8Array} from '~/common/types';
import {type IdColor} from '~/common/utils/id-color';

export type AvatarShape = 'square' | 'circle';

export interface AvatarData {
    readonly img: ReadonlyUint8Array | undefined;
    readonly color: IdColor;
    readonly initials: string;
}
