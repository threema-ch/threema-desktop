import {downsizeImage, getImageDimensions} from '~/common/dom/utils/image';
import {ImageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {THUMBNAIL_MAX_SIZE} from '~/common/network/protocol/constants';
import type {Dimensions} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {FilenameDetails} from '~/common/utils/file';
import {mediaTypeToImageType} from '~/common/utils/image';
import type {WritableStore} from '~/common/utils/store';
import {getUtf8ByteLength} from '~/common/utils/string';

export interface MediaFile {
    readonly type: 'local' | 'pasted';
    readonly file: File;
    readonly thumbnail: Promise<Blob | undefined>;
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
): readonly [mediaFile: MediaFile, result: ValidationResult][] {
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
    }
    return {
        status: 'error',
        reasons,
    };
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
 * If the file is a regular image file, resize and compress the image. Return it, along with the new
 * dimensions of the image.
 *
 * Some image types, like GIF, will not be resized.
 *
 * All metadata will be stripped from the image.
 */
export async function resizeImage(
    file: File,
    log?: Logger,
): Promise<{blob: Blob; dimensions: Dimensions} | undefined> {
    // Check if file is a valid image
    const imageType = mediaTypeToImageType(file.type);
    if (imageType === undefined) {
        return undefined;
    }

    // Certain image types should not be resized
    let outputMediaType = file.type;
    switch (imageType) {
        case ImageType.GIF: {
            log?.debug('Not resizing GIF, fetching original dimensions');
            const dimensions = await getImageDimensions(file);
            if (dimensions === undefined) {
                return undefined;
            }
            return {blob: file, dimensions};
        }
        case ImageType.JPEG:
        case ImageType.PNG:
        case ImageType.WEBP:
            break;
        case ImageType.AVIF:
            outputMediaType = 'image/jpeg';
            break;
        default:
            unreachable(imageType);
    }

    // Determine media size
    // TODO(DESK-1129): Allow configuring image size
    const imageSize = 2000;

    // Resize and return
    const quality = 0.85;
    const result = await downsizeImage(file, outputMediaType, imageSize, quality, log);
    if (result === undefined) {
        return undefined;
    }
    return {blob: result.resized, dimensions: result.resizedDimensions};
}

/**
 * If the file is a media file, generate a thumbnail.
 */
export async function generateThumbnail(file: File, log?: Logger): Promise<Blob | undefined> {
    // Check if file is elegible for thumbnail creation
    const imageType = mediaTypeToImageType(file.type);
    if (imageType === undefined) {
        return undefined;
    }

    // Determine thumbnail media type and size based on image type
    //
    // Note: Chromium does not seem to compress PNGs, so we reduce their size instead to prevent
    //       thumbnails from getting too large
    let thumbnailMediaType;
    switch (imageType) {
        case ImageType.JPEG:
        case ImageType.GIF:
        case ImageType.WEBP:
        case ImageType.AVIF:
            thumbnailMediaType = 'image/jpeg';
            break;
        case ImageType.PNG:
            thumbnailMediaType = 'image/png';
            break;
        default:
            unreachable(imageType);
    }
    const thumbnailSize = imageType === ImageType.PNG ? THUMBNAIL_MAX_SIZE / 2 : THUMBNAIL_MAX_SIZE;

    // Resize and return
    const quality = 0.8;
    const result = await downsizeImage(file, thumbnailMediaType, thumbnailSize, quality, log);
    return result?.resized;
}
