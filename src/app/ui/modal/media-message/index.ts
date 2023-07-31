import {downsizeImage} from '~/common/dom/utils/image';
import {type Logger} from '~/common/logging';
import {THUMBNAIL_MAX_SIZE} from '~/common/network/protocol/constants';
import {type Dimensions} from '~/common/types';
import {type FilenameDetails} from '~/common/utils/file';
import {type WritableStore} from '~/common/utils/store';
import {getUtf8ByteLength} from '~/common/utils/string';

export interface MediaFile {
    readonly type: 'local' | 'pasted';
    readonly file: File;
    readonly thumbnail: Promise<Blob | undefined>;
    readonly dimensions: Promise<Dimensions | undefined>;
    readonly caption: WritableStore<string | undefined>;
    readonly sanitizedFilenameDetails: FilenameDetails;
    readonly sendAsFile: WritableStore<boolean>;
}

type ValidationErrorReason = 'fileTooLarge' | 'captionTooLong';

export type ValidationResult =
    | {readonly status: 'ok'}
    | {readonly status: 'error'; readonly reasons: ValidationErrorReason[]};

const FAILURE_RULES: readonly [
    rule: (mediaFile: MediaFile) => boolean,
    reason: ValidationErrorReason,
][] = [
    [isFileTooLarge, 'fileTooLarge'],
    [isCaptionTooLong, 'captionTooLong'],
];

/**
 * Validate a list of {@link MediaFile}s to help determine if the files should be sendable.
 *
 * @param mediaFiles The {@link MediaFile}s to validate.
 * @returns A list of pairs of {@link MediaFile} and their respective {@link ValidationResult}.
 */
export function validateMediaFiles(
    mediaFiles: MediaFile[],
): [mediaFile: MediaFile, result: ValidationResult][] {
    return mediaFiles.map((mediaFile) => [mediaFile, validateMediaFile(mediaFile)]);
}

/**
 * Validates a {@link MediaFile} to help determining if the file should be sendable.
 *
 * @param mediaFile The {@link MediaFile} to validate.
 * @returns The {@link ValidationResult}.
 */
export function validateMediaFile(mediaFile: MediaFile): ValidationResult {
    const reasons = FAILURE_RULES.reduce<ValidationErrorReason[]>(
        (acc, [rule, reason]) => (rule(mediaFile) ? [...acc, reason] : acc),
        [],
    );

    if (reasons.length === 0) {
        return {
            status: 'ok',
        };
    } else {
        return {
            status: 'error',
            reasons,
        };
    }
}

function isFileTooLarge(mediaFile: MediaFile): boolean {
    return mediaFile.file.size > import.meta.env.MAX_FILE_MESSAGE_BYTES;
}

function isCaptionTooLong(mediaFile: MediaFile): boolean {
    const caption = mediaFile.caption.get();
    if (caption === undefined) {
        return false;
    }

    return getUtf8ByteLength(caption) > import.meta.env.MAX_FILE_MESSAGE_CAPTION_BYTES;
}

/**
 * If the file is a media file, generate a thumbnail. Return it, along with the original dimensions
 * of the image.
 */
export async function generateThumbnail(
    file: File,
    log?: Logger,
): Promise<{thumbnail: Blob; originalDimensions: Dimensions} | undefined> {
    // Check if file is elegible for thumbnail creation
    if (!file.type.startsWith('image/')) {
        // Not an image file
        return undefined;
    }

    // Determine media type and thumbnail size
    //
    // Note: Chromium does not seem to compress PNGs, so we reduce their size instead to prevent
    //       thumbnails from getting too large
    const thumbnailMediaType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const thumbnailSize =
        thumbnailMediaType === 'image/png' ? THUMBNAIL_MAX_SIZE / 2 : THUMBNAIL_MAX_SIZE;

    // Resize and return
    const quality = 0.8;
    const resized = await downsizeImage(file, thumbnailMediaType, thumbnailSize, quality, log);
    if (resized === undefined) {
        return undefined;
    }
    return {thumbnail: resized.resized, originalDimensions: resized.originalDimensions};
}
