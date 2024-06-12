import type {I18nType} from '~/app/ui/i18n-types';
import type {SyncFailure, SyncResult} from '~/app/ui/utils/file-sync/types';
import {convertImage} from '~/common/dom/utils/image';
import {BlobFetchError} from '~/common/error';
import type {ReadonlyUint8Array} from '~/common/types';
import {ensureError, unreachable} from '~/common/utils/assert';
import type {FileBytesAndMediaType} from '~/common/utils/file';

/**
 * Fetch file or thumbnail bytes of a message using the provided `fetch` function and wrap it in a
 * {@link SyncResult}.
 */
export async function syncAndGetPayload<TPayload extends FileBytesAndMediaType>(
    fetch: () => Promise<TPayload | undefined>,
    t: I18nType['t'],
): Promise<SyncResult<TPayload>> {
    return await fetch()
        .then((fileData) => {
            if (fileData === undefined) {
                // The getBlob method for main blob bytes resolves with `undefined` if the message
                // type is unsupported (e.g. for a text message).
                throw new Error('syncAndGetPayload failed: fetch returned undefined');
            }

            return {
                status: 'ok',
                data: fileData,
            } as const;
        })
        .catch((error: unknown) => {
            if (error instanceof BlobFetchError) {
                return convertBlobFetchError(error, t);
            }
            return fail(
                ensureError(error),
                t('messaging.error--file-not-loaded', 'Data could not be loaded.'),
            );
        });
}

/**
 * Retrieve bytes and save as a file to the user's filesystem.
 */
export async function syncAndSavePayloadAsFile(
    fileName: string,
    ...args: Parameters<typeof syncAndGetPayload<FileBytesAndMediaType>>
): Promise<SyncResult<FileBytesAndMediaType>> {
    const result = await syncAndGetPayload(...args);
    if (result.status === 'ok') {
        saveBytesAsFile(result.data.bytes, fileName, result.data.mediaType);
    }

    return result;
}

/**
 * Retrieve an image's bytes and copy to the user's clipboard. Note: Whether the payload is an image
 * is not asserted, and should be done beforehand.
 */
export async function syncAndCopyImagePayloadToClipboard(
    mediaType: string,
    ...args: Parameters<typeof syncAndGetPayload<FileBytesAndMediaType>>
): Promise<SyncResult<undefined>> {
    const result = await syncAndGetPayload(...args);
    if (result.status === 'ok') {
        return await copyImageBytesToClipboard(result.data.bytes, result.data.mediaType, args[1]);
    }

    return result;
}

/**
 * Helper that returns a {@link SyncResult} with status `err` and the given message.
 */
function fail(error: Error, message: string): SyncFailure {
    return {status: 'error', error, message};
}

/**
 * Convert a {@link BlobFetchError} from a sync operation to a {@link SyncFailure}.
 */
function convertBlobFetchError(error: BlobFetchError, t: I18nType['t']): SyncFailure {
    switch (error.type.kind) {
        case 'file-storage-error': {
            switch (error.type.cause) {
                case 'write-error':
                    return fail(
                        error,
                        t(
                            'messaging.error--file-storage-write-error',
                            'Downloaded data could not be stored in file storage. Do you have enough free disk space?',
                        ),
                    );

                case 'not-found':
                case 'dir-not-found':
                case 'read-error':
                case 'delete-error':
                case 'unsupported-format':
                case undefined:
                    return fail(
                        error,
                        t(
                            'messaging.error--file-storage-read-error',
                            'Could not read data from file storage.',
                        ),
                    );

                default:
                    return unreachable(error.type);
            }
        }
        case 'temporary-download-error':
            return fail(
                error,
                t(
                    'messaging.error--file-temporary-download-error',
                    'Download failed. Please check your internet connection and try again.',
                ),
            );

        case 'permanent-download-error':
            return fail(
                error,
                t(
                    'messaging.error--file-permanent-download-error',
                    'Data could not be downloaded, the download expired.',
                ),
            );

        case 'decryption-error':
            return fail(
                error,
                t('messaging.error--file-decryption-error', 'Data could not be decrypted.'),
            );

        case 'internal':
            return fail(
                error,
                t(
                    'messaging.error--file-internal-error',
                    'Data could not be loaded due to an internal error.',
                ),
            );

        default:
            return unreachable(error.type);
    }
}

/**
 * Save the specified bytes as a file to the user's filesystem.
 */
function saveBytesAsFile(bytes: ReadonlyUint8Array, fileName: string, mediaType: string): void {
    const blob = new Blob([bytes], {type: mediaType});
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    // TODO(DESK-949): Improved download UX.
}

/**
 * Copy the given image bytes to the user's clipboard.
 *
 * @returns Whether copying was successful.
 */
async function copyImageBytesToClipboard(
    bytes: ReadonlyUint8Array,
    mediaType: string,
    t: I18nType['t'],
): Promise<SyncResult<undefined>> {
    try {
        let blob = new Blob([bytes], {type: mediaType});
        if (mediaType !== 'image/png') {
            // Convert other image subtypes to png for clipboard compatibility.
            blob = await convertImage(blob, 'image/png');
        }

        await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);

        return {
            status: 'ok',
            data: undefined,
        };
    } catch (error) {
        return fail(
            ensureError(error),
            t('messaging.error--copy-message-image', 'Could not copy image to clipboard'),
        );
    }
}
