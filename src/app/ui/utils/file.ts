import {isBlobAccessible} from '~/app/ui/utils/blob';
import {filterAsync} from '~/common/utils/array';

/**
 * Represents the result of handling added files by the user (from the user's system).
 *
 * Contains one of the following statuses:
 *
 * - ok: All added files were accessible and readable.
 * - partial: Only some of the added files were accessible or readable, while others were not.
 * - inaccessible: All added files were inaccessible or not readable.
 * - empty: No files were added at all.
 */
export type FileLoadResult =
    | {readonly status: 'ok'; readonly files: File[]}
    | {readonly status: 'partial'; readonly files: File[]}
    | {readonly status: 'inaccessible'}
    | {readonly status: 'empty'};

/**
 * In various cases, {@link File} objects are not accessible by the application due to permission
 * issues, sandboxing, etc. This function validates an array of {@link File}s or a {@link FileList}
 * and returns a {@link FileLoadResult}, which includes:
 *
 * - A `status` of whether the files are accessible.
 * - An array containing only the accessible files.
 */
export async function validateFiles(files: File[] | FileList): Promise<FileLoadResult> {
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
