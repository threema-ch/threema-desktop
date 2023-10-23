import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {
    syncAndCopyImagePayloadToClipboard,
    syncAndSavePayloadAsFile,
} from '~/app/ui/utils/file-sync/helpers';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {unreachable} from '~/common/utils/assert';

/**
 * Handles copying a file of type image to the user's clipboard. Note: If the given file is
 * `undefined` or not an image, this function will log an error and return.
 *
 * @param file The file to copy to the user's clipboard.
 * @param log Logger to use.
 * @param t Function to use for obtaining translated, human-readable status messages.
 * @param onSuccess Callback to run if copying was successful (e.g., show a toast).
 * @param onFailure Callback to run if copying failed (e.g., show a toast).
 */
export async function handleCopyImage(
    file: MessageProps['file'],
    log: Logger,
    t: I18nType['t'],
    onSuccess?: (message: string) => void,
    onFailure?: (message: string) => void,
): Promise<void> {
    if (file === undefined) {
        log.error("Attempted to copy image, but message doesn't contain a file");
        return;
    }
    if (file.type !== 'image') {
        log.error(`Attempted to copy image, but file is of type ${file.type}`);
        return;
    }
    log.debug('Attempting to copy image to clipboard');

    await syncAndCopyImagePayloadToClipboard(file.mediaType, file.fetchFilePayload, t).then(
        (result) => {
            switch (result.status) {
                case 'ok':
                    log.debug('Image successfully copied to clipboard');

                    onSuccess?.(
                        t('messaging.success--copy-message-image', 'Image copied to clipboard'),
                    );
                    break;

                case 'error':
                    log.error(
                        `File payload sync or save to clipboard failed: ${extractErrorMessage(
                            result.error,
                            'short',
                        )}`,
                    );

                    onFailure?.(result.message);
                    break;

                default:
                    unreachable(result);
            }
        },
    );
}

/**
 * Handles saving a file to the user's filesystem. Note: If the given file is
 * `undefined`, this function will log an error and return.
 *
 * @param file The file to save.
 * @param log Logger to use.
 * @param t Function to use for obtaining translated, human-readable status messages.
 * @param onFailure Callback to run if saving failed (e.g., show a toast).
 */
export async function handleSaveAsFile(
    file: MessageProps['file'],
    log: Logger,
    t: I18nType['t'],
    onFailure?: (message: string) => void,
): Promise<void> {
    if (file === undefined) {
        log.error("Attempted to save as file, but message doesn't contain a file");
        return;
    }

    await syncAndSavePayloadAsFile(
        file.name.raw ?? file.name.default,
        file.mediaType,
        file.fetchFilePayload,
        t,
    ).then((result) => {
        switch (result.status) {
            case 'ok':
                // Do nothing, as the system file dialog will open and provide the user with visual
                // feedback that the operation was successful.
                break;

            case 'error':
                log.error(
                    `File payload sync failed: ${extractErrorMessage(result.error, 'short')}`,
                );

                onFailure?.(result.message);
                break;

            default:
                unreachable(result);
        }
    });
}
