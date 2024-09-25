import type {DeleteProfileOptions, ElectronIpc} from '~/common/electron-ipc';
import {TRANSFER_HANDLER} from '~/common/index';
import type {LauncherService} from '~/common/launcher';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

export class FrontendLauncherService implements LauncherService {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _electronIpc: ElectronIpc) {}

    /** @inheritdoc */
    public close(): void {
        this._electronIpc.closeApp();
    }

    /** @inheritdoc */
    public deleteProfileAndRestart(options: DeleteProfileOptions): void {
        this._electronIpc.deleteProfileAndRestartApp(options);
    }

    /** @inheritdoc */
    public restart(): void {
        this._electronIpc.restartApp();
    }

    /** @inheritdoc */
    public restartAndInstallUpdate(): void {
        this._electronIpc.restartAppAndInstallUpdate();
    }
}
