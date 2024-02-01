import {asyncFilter} from '#3sc/utils/array';
import {isBlobAccessible} from '#3sc/utils/blob';

export type FileResult =
    | {readonly status: 'ok'; readonly files: File[]}
    | {readonly status: 'partial'; readonly files: File[]}
    | {readonly status: 'inaccessible'}
    | {readonly status: 'empty'};

/**
 * In various cases, {@link File} objects referenced in a {@link FileList} are not accessible by the
 * application due to permission issues, sandboxing, etc. This function validates a {@link FileList}
 * and returns a {@link FileResult}, which includes:
 * - A `status` of whether the files are accessible.
 * - An array of only the accessible files.
 *
 * @param fileList The {@link FileList} to validate.
 * @returns A {@link FileResult}.
 */
export async function validateFileList(fileList: FileList): Promise<FileResult> {
    const rawFileList = Array.from(fileList);
    const fileResult = await validateFiles(rawFileList);
    return fileResult;
}

/**
 * In various cases, {@link File} objects are not accessible by the application due to permission
 * issues, sandboxing, etc. This function validates a list of {@link File}s and returns a
 * {@link FileResult}, which includes:
 *
 * - A `status` of whether the files are accessible.
 * - An array of only the accessible files.
 */
export async function validateFiles(rawFileList: File[]): Promise<FileResult> {
    if (rawFileList.length <= 0) {
        // Input `FileList` is empty. Shouldn't happen, but needs to be handled.
        return {status: 'empty'};
    }

    const files = await asyncFilter(isBlobAccessible, rawFileList);
    if (files.length <= 0) {
        // We can't access any of the files of the input `FileList`.
        return {status: 'inaccessible'};
    }
    if (rawFileList.length === files.length) {
        // All the files of the input `FileList` can be accessed.
        return {status: 'ok', files};
    }

    // Else, we can only access some of the files of input `FileList`.
    return {status: 'partial', files};
}
