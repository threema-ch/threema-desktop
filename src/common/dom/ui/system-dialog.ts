import type {
    DialogAction,
    SystemDialog,
    SystemDialogHandle,
    SystemDialogService,
} from '~/common/system-dialog';
import {unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {WritableStore} from '~/common/utils/store';

/**
 * Store containing list of currently active system dialogs, living in the frontend.
 *
 * If the list of dialogs is non-empty, then the first one will be shown.
 */
export const systemDialogStore = new WritableStore<
    {readonly handle: FrontendSystemDialogHandle; readonly dialog: SystemDialog}[]
>([]);

export class FrontendSystemDialogHandle implements SystemDialogHandle {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    /**
     * Resolves once the dialog was closed.
     */
    public readonly closed: ResolvablePromise<DialogAction> = new ResolvablePromise<DialogAction>();
}

export class FrontendSystemDialogService implements SystemDialogService {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    /** @inheritdoc */
    public open(dialog: SystemDialog): SystemDialogHandle {
        return this._open(dialog, false);
    }

    /** @inheritdoc */
    public openOnce(dialog: SystemDialog): SystemDialogHandle {
        return this._open(dialog, true);
    }

    private _open(dialog: SystemDialog, once = false): SystemDialogHandle {
        let handle: FrontendSystemDialogHandle | undefined;

        // TODO(DESK-487): Return backchannel like in notifications for user interaction
        systemDialogStore.update((currentDialogs) => {
            const dialogOfSameType = currentDialogs.find(
                ({dialog: currentDialog}) => currentDialog.type === dialog.type,
            );

            // If `once` is set and another dialog of the same type is found, don't add a new
            // dialog, but instead return the handle to the existing dialog.
            if (once && dialogOfSameType !== undefined) {
                handle = dialogOfSameType.handle;
                return currentDialogs;
            }

            // Otherwise, store a new dialog instance
            handle = new FrontendSystemDialogHandle();
            return [{dialog, handle}, ...currentDialogs];
        });

        return unwrap(handle, 'Expected frontend system dialog handle to be set');
    }
}
