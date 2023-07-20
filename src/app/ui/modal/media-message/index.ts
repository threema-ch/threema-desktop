import {type Logger} from '~/common/logging';
import {THUMBNAIL_MAX_SIZE} from '~/common/network/protocol/constants';
import {type Dimensions} from '~/common/types';
import {debugAssert, unwrap} from '~/common/utils/assert';
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
    sendAsFile: boolean;
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

    // Create image bitmap and wait for it to load
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch (error) {
        log?.warn(`Could not load bitmap: ${error}`);
        return undefined;
    }

    // Extract dimensions
    const dimensions = {width: bitmap.width, height: bitmap.height};

    // Determine media type and thumbnail scale factor
    //
    // Note: Chromium does not seem to compress PNGs, so we reduce their size instead to prevent
    //       thumbnails from getting too large
    const thumbnailMediaType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const mediaTypeScaleFactor = thumbnailMediaType === 'image/png' ? 0.5 : 1.0;

    // Downscale image to desired size
    //
    // Note: The OffscreenCanvas type has a Promise based API, in contrast to the callback-based
    //       Canvas API. Thus the `transferControlToOffscreen` call.
    const canvas = document.createElement('canvas').transferControlToOffscreen();
    const ctx = unwrap(canvas.getContext('2d'), 'Canvas 2D context is undefined');
    const scaleFactor =
        Math.min(THUMBNAIL_MAX_SIZE / Math.max(dimensions.width, dimensions.height), 1.0) *
        mediaTypeScaleFactor;
    canvas.width = dimensions.width * scaleFactor;
    canvas.height = dimensions.height * scaleFactor;
    debugAssert(
        canvas.width <= THUMBNAIL_MAX_SIZE,
        `Thumbnail width ${canvas.width} is larger than max size of ${THUMBNAIL_MAX_SIZE}`,
    );
    debugAssert(
        canvas.height <= THUMBNAIL_MAX_SIZE,
        `Thumbnail height ${canvas.height} is larger than max size of ${THUMBNAIL_MAX_SIZE}`,
    );
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Release bitmap
    bitmap.close();

    // Extract thumbnail data from canvas
    const thumbnailBlob = await canvas.convertToBlob({
        type: thumbnailMediaType,
        quality: 0.8, // Note: Ignored for PNGs
    });
    log?.debug(
        `Generated thumbnail: ${thumbnailBlob.type}, dimensions=${canvas.width}x${
            canvas.height
        }, ${Math.floor(thumbnailBlob.size / 1024)} KiB`,
    );
    return {thumbnail: thumbnailBlob, originalDimensions: dimensions};
}
