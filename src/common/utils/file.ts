import {mediaTypeToExtensions} from '~/app/ui/svelte-components/utils/mediatype';
import type {ReadonlyUint8Array} from '~/common/types';

/**
 * An object containing the bytes of a file, as well as the corresponding media type.
 */
export interface FileBytesAndMediaType {
    readonly bytes: ReadonlyUint8Array;
    readonly mediaType: string;
}

/**
 * Get file basename and extension of the given filename.
 */
export function getFileNameAndExtension(filename: string): {basename: string; extension: string} {
    if (filename === '') {
        return {basename: '', extension: ''};
    }
    const filenameSegments = filename.split(/\./u);
    const noExtensionFound = filenameSegments.length === 1;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const extension = filenameSegments.pop()!.substring(0, 4);
    if (noExtensionFound || extension === '') {
        return {basename: filename, extension: ''};
    }
    return {basename: filenameSegments.join('.'), extension};
}

export interface FilenameDetails {
    readonly name: string;
    readonly basename: string;
    readonly extension: string;
    readonly displayType: string | undefined;
}

function pickExtension<T extends string>(array: T[]): T {
    const first = array.at(0);
    if (first !== undefined && first.length <= 4) {
        return first;
    }

    const shortest = array.reduce((a, b) => (a.length < b.length ? a : b));
    return shortest;
}

export function getSanitizedFileNameDetails(file: {name: string; type: string}): FilenameDetails {
    const originalFilename = file.name;
    const validExtensionsForMediaType = mediaTypeToExtensions(file.type);

    // If there's no filename, we don't need to do any parsing. However, set the displayType if a
    // media type is provided.
    if (originalFilename === '') {
        return {
            name: '',
            basename: '',
            extension: '',
            displayType:
                validExtensionsForMediaType === undefined
                    ? undefined
                    : pickExtension(validExtensionsForMediaType),
        };
    }

    const {basename, extension: originalExtension} = getFileNameAndExtension(originalFilename);

    // If we don't know this media type, we just pass on the information we got.
    if (validExtensionsForMediaType === undefined) {
        return {
            name: originalFilename,
            basename,
            extension: originalExtension,
            displayType: originalExtension === '' ? undefined : originalExtension,
        };
    }

    // If we do know this media type and the file has a valid file extension, keep it.
    const defaultExtensionForMediaType = pickExtension(validExtensionsForMediaType);
    if (validExtensionsForMediaType.includes(originalExtension)) {
        return {
            name: originalFilename,
            basename,
            extension: originalExtension,
            displayType: defaultExtensionForMediaType,
        };
    }

    // Otherwise, we do know the media type, but the file extension is not valid. Fix it by
    // appending the expected extension at the end of the original filename (i.e. do not attempt to
    // replace any existing extension).
    const originalFilenameWithoutTrailingDots = originalFilename.replace(/\.+$/u, '');
    return {
        name: `${originalFilenameWithoutTrailingDots}.${defaultExtensionForMediaType}`,
        basename: originalFilenameWithoutTrailingDots,
        extension: defaultExtensionForMediaType,
        displayType: defaultExtensionForMediaType,
    };
}
