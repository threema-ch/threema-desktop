import {type FilenameDetails} from '~/common/utils/file';
import {type WritableStore} from '~/common/utils/store';

export interface MediaFile {
    type: 'local' | 'pasted';
    file: File;
    caption: WritableStore<string | undefined>;
    sanitizedFilenameDetails: FilenameDetails;
}

/**
 * The maximum allowed byte length of the caption.
 *
 * TODO(SE-266): Update (message) size limitation
 */
export const MAX_CAPTION_BYTE_LENGTH = 1000;
