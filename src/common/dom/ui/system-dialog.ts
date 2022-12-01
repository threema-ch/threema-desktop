import {
    type DialogAction,
    type SystemDialog,
    type SystemDialogHandle,
    type SystemDialogService,
} from '~/common/system-dialog';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {WritableStore} from '~/common/utils/store';

/**
 * List of currently active system dialogs.
 *
 * If the list of dialogs is non-empty, then the first one will be shown.
 */
export const systemDialogStore = new WritableStore<
    {readonly handle: FrontendSystemDialogHandle; readonly dialog: SystemDialog}[]
>([]);

export class FrontendSystemDialogHandle implements SystemDialogHandle {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    /**
     * Resolves once the dialog was closed.
     */
    public readonly closed: ResolvablePromise<DialogAction> = new ResolvablePromise<DialogAction>();
}

export class FrontendSystemDialogService implements SystemDialogService {
    /**
     * Show the specified system dialog.
     *
     * Note: If another dialog is already being shown, this dialog will be queued until the other
     * dialog(s) are closed.
     */
    public open(dialog: SystemDialog): SystemDialogHandle {
        const handle = new FrontendSystemDialogHandle();
        // TODO(WEBMD-487): Return backchannel like in notifications for user interaction
        systemDialogStore.update((currentDialogs) => [...currentDialogs, {dialog, handle}]);

        return handle;
    }
}
