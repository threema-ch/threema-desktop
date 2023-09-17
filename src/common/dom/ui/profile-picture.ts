import type {ReadonlyUint8Array} from '~/common/types';
import {eternalPromise} from '~/common/utils/promise';

/**
 * Transform profile picture bytes into a blob or a promise of a blob.
 */
export function transformProfilePicture(
    picture: ReadonlyUint8Array | undefined,
): Blob | Promise<Blob> {
    if (picture === undefined) {
        return eternalPromise();
    }
    return new Blob([picture], {type: 'image/jpeg'});
}
