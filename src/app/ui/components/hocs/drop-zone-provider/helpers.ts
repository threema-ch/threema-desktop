import type {FileDropResult} from '~/app/ui/components/hocs/drop-zone-provider/types';
import {isBlobAccessible} from '~/app/ui/utils/blob';
import {filterAsync} from '~/common/utils/array';

/**
 * In various cases, {@link File} objects are not accessible by the application due to permission
 * issues, sandboxing, etc. This function validates an array of {@link File}s or a {@link FileList}
 * and returns a {@link FileDropResult}, which includes:
 *
 * - A `status` of whether the files are accessible.
 * - An array containing only the accessible files.
 */
export async function validateFiles(files: File[] | FileList): Promise<FileDropResult> {
    const inputFiles = files instanceof FileList ? Array.from(files) : files;
    if (inputFiles.length <= 0) {
        // Input `FileList` is empty. Shouldn't happen, but needs to be handled.
        return {status: 'empty'};
    }

    const filteredFiles = await filterAsync(isBlobAccessible, inputFiles);
    if (filteredFiles.length <= 0) {
        // We can't access any of the files of the input `FileList`.
        return {status: 'inaccessible'};
    }
    if (filteredFiles.length === inputFiles.length) {
        // All the files of the input `FileList` can be accessed.
        return {status: 'ok', files: filteredFiles};
    }

    // Else, we can only access some of the files of input `FileList`.
    return {status: 'partial', files: filteredFiles};
}
