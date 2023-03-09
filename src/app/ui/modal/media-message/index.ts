import {type FilenameDetails} from '~/common/utils/file';

export interface MediaFile {
    type: 'local' | 'pasted';
    file: File;
    caption?: string;
    sanitizedFilenameDetails: FilenameDetails;
}
