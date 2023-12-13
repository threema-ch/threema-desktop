import type {FileResult} from '#3sc/utils/filelist';
import type {i18n as i18nStore} from '~/app/ui/i18n';
import {toast} from '~/app/ui/snackbar';
import {type FileLoadResult, validateFiles} from '~/app/ui/utils/file';
import type {Logger} from '~/common/logging';
import {unreachable} from '~/common/utils/assert';

/**
 * Prepares files from various sources (e.g., dropping, attaching, etc.) by validating them and
 * showing an appropriate toast to the user if necessary.
 *
 * @returns An array of validated, accessible {@link File}s that can be used to initialize the
 *   `MediaComposeModal`.
 */
export async function prepareFilesForMediaComposeModal(
    i18n: typeof i18nStore,
    log: Logger,
    files?: File[] | FileLoadResult | FileResult,
): Promise<File[] | undefined> {
    let validatedFiles: FileLoadResult | undefined = undefined;
    if (files !== undefined) {
        if (files instanceof Array) {
            await validateFiles(files)
                .then((result) => {
                    validatedFiles = result;
                })
                .catch((error) => log.error(`An error occurred when validating files: ${error}`));
        } else {
            validatedFiles = files;
        }
    }

    if (validatedFiles === undefined) {
        return undefined;
    }

    switch (validatedFiles.status) {
        case 'empty':
        case 'inaccessible':
            showFileResultErrorToast(validatedFiles.status, i18n, log);
            return undefined;

        case 'partial':
            showFileResultErrorToast(validatedFiles.status, i18n, log);
            break;

        case 'ok':
            break;

        default:
            unreachable(validatedFiles);
    }

    return validatedFiles.files;
}

/**
 * Displays an appropriate error toast for the given file result error.
 */
export function showFileResultErrorToast(
    status: 'empty' | 'inaccessible' | 'partial',
    i18n: typeof i18nStore,
    log: Logger,
): void {
    switch (status) {
        case 'empty':
            log.warn('A file or list of files was added, but it was empty');
            toast.addSimpleFailure(
                i18n.get().t('messaging.error--add-files-empty', "Files couldn't be added"),
            );
            break;

        case 'inaccessible':
            log.warn('A file or list of files was added, but it could not be accessed');
            toast.addSimpleFailure(
                i18n
                    .get()
                    .t('messaging.error--add-files-inaccessible', "Files couldn't be accessed"),
            );
            break;

        case 'partial':
            log.warn('A file or list of files was added, but some files could not be accessed');
            toast.addSimpleWarning(
                i18n
                    .get()
                    .t(
                        'messaging.error--add-files-partially-inaccessible',
                        "Some files couldn't be accessed",
                    ),
            );
            break;

        default:
            unreachable(status);
    }
}
