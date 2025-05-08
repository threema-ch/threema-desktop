import type {
    DeleteProfileOptions,
    ElectronIpc,
    ErrorDetails,
    SystemInfo,
} from '~/common/electron-ipc';
import type {IFrontendElectronService} from '~/common/electron-service';
import {TRANSFER_HANDLER} from '~/common/index';
import type {LogInfo} from '~/common/node/file-storage/log-info';
import type {DomainCertificatePin, ReadonlyUint8Array, u53} from '~/common/types';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

// Extend global APIs
//
// TODO(DESK-684): Consider using comlink/endpoint for IPC communication
declare global {
    interface Window {
        /**
         * The window.app property exposes the IPC interface towards the renderer thread. It is
         * initialized in the preload script.
         */
        readonly app: ElectronIpc;
    }
}

export class ElectronIpcService implements ElectronIpc {
    public readonly frontendHandle: IFrontendElectronService;

    public constructor() {
        this.frontendHandle = {
            [TRANSFER_HANDLER]: PROXY_HANDLER,
            updatePublicKeyPins: this.updatePublicKeyPins.bind(this),
            removeOldProfiles: this.removeOldProfiles.bind(this),
            restartAppAndInstallUpdate: this.restartAppAndInstallUpdate.bind(this),
        };
    }

    /** @inheritdoc */
    public async clearLogFiles(): Promise<void> {
        await window.app.clearLogFiles();
    }

    /** @inheritdoc */
    public closeApp(): void {
        window.app.closeApp();
    }

    /** @inheritdoc */
    public deleteProfileAndRestartApp(options: DeleteProfileOptions): void {
        window.app.deleteProfileAndRestartApp(options);
    }

    /** @inheritdoc */
    public getAppPath(): string {
        return window.app.getAppPath();
    }

    /** @inheritdoc */
    public async getGzippedLogFiles(): Promise<{app: ReadonlyUint8Array; bw: ReadonlyUint8Array}> {
        return await window.app.getGzippedLogFiles();
    }

    /** @inheritdoc */
    public getLatestProfilePath(): string | undefined {
        return window.app.getLatestProfilePath();
    }

    /** @inheritdoc */
    public async getLogInformation(): Promise<LogInfo> {
        return await window.app.getLogInformation();
    }

    /** @inheritdoc */
    public async getSystemInfo(): Promise<SystemInfo> {
        return await window.app.getSystemInfo();
    }

    /** @inheritdoc */
    public async getTestData(): Promise<string | undefined> {
        return await window.app.getTestData();
    }

    /** @inheritdoc */
    public async isFileLoggingEnabled(): Promise<boolean | undefined> {
        return await window.app.isFileLoggingEnabled();
    }

    /** @inheritdoc */
    public async isSpellcheckEnabled(): Promise<boolean | undefined> {
        return await window.app.isSpellcheckEnabled();
    }

    /** @inheritdoc */
    public async loadUserPassword(): Promise<string | undefined> {
        return await window.app.loadUserPassword();
    }

    /** @inheritdoc */
    public async logToFile(
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
        data: string,
    ): Promise<void> {
        await window.app.logToFile(level, data);
    }

    /** @inheritdoc */
    public removeOldProfiles(): void {
        window.app.removeOldProfiles();
    }

    /** @inheritdoc */
    public reportError(error: ErrorDetails): void {
        window.app.reportError(error);
    }

    /** @inheritdoc */
    public restartApp(): void {
        window.app.restartApp();
    }

    /** @inheritdoc */
    public restartAppAndInstallUpdate(): void {
        window.app.restartAppAndInstallUpdate();
    }

    /** @inheritdoc */
    public setFileLoggingEnabledAndRestart(enabled: boolean): void {
        window.app.setFileLoggingEnabledAndRestart(enabled);
    }

    /** @inheritdoc */
    public setSpelleckEnabledAndRestart(enabled: boolean): void {
        window.app.setSpelleckEnabledAndRestart(enabled);
    }

    /** @inheritdoc */
    public async storeUserPassword(password: string): Promise<boolean> {
        return await window.app.storeUserPassword(password);
    }

    /** @inheritdoc */
    public updateAppBadge(totalUnreadMessageCount: u53): void {
        window.app.updateAppBadge(totalUnreadMessageCount);
    }

    /** @inheritdoc */
    public updatePublicKeyPins(publicKeyPins: DomainCertificatePin[] | undefined): void {
        if (publicKeyPins !== undefined) {
            window.app.updatePublicKeyPins(publicKeyPins);
        }
    }
}
