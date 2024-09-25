import {TRANSFER_HANDLER} from '~/common/index';
import type {
    SystemDialog,
    SystemDialogAction,
    SystemDialogHandle,
    SystemDialogService,
} from '~/common/system-dialog';
import type {f64} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
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
    public readonly closed: ResolvablePromise<SystemDialogAction> =
        new ResolvablePromise<SystemDialogAction>({
            uncaught: 'default',
        });

    public constructor(private readonly _setProgress: (progress: f64) => void) {}

    /**
     * Update the value of the progress bar displayed in the system dialog, if any.
     *
     * @param progress Fractional progress between `0` and `1`.
     */
    public setProgress(progress: f64): void {
        this._setProgress(progress);
    }
}

export class FrontendSystemDialogService implements SystemDialogService {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _setProgress: (progress: f64) => void) {}

    /** @inheritdoc */
    public closeAll(): void {
        systemDialogStore.set([]);
    }

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

        // TODO(DESK-487): Return backchannel like in notifications for user interaction.
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

            // Otherwise, store a new dialog instance.
            handle = new FrontendSystemDialogHandle(this._setProgress);
            return [{dialog, handle}, ...currentDialogs];
        });

        return unwrap(handle, 'Expected frontend system dialog handle to be set');
    }
}
