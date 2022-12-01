import {type BlobBytes} from '~/common/network/protocol/blob';
import {eternalPromise} from '~/common/utils/promise';

export function transformAvatarPicture(picture: BlobBytes | undefined): Blob | Promise<Blob> {
    if (picture === undefined) {
        return eternalPromise();
    }
    return new Blob([picture], {type: 'image/jpeg'});
}
