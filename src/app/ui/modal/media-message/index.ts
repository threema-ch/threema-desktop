import {type FilenameDetails} from '~/common/utils/file';
import {type WritableStore} from '~/common/utils/store';
import {getUtf8ByteLength} from '~/common/utils/string';

export interface MediaFile {
    type: 'local' | 'pasted';
    file: File;
    caption: WritableStore<string | undefined>;
    sanitizedFilenameDetails: FilenameDetails;
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
 * Validates a list of {@link MediaFile}s to help determining if the files should be sendable.
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
