import type {
    DeleteProfileOptions,
    ElectronIpc,
    ErrorDetails,
    ScreenSharingSource,
    SystemInfo,
} from '~/common/electron-ipc';
import type {IFrontendElectronService} from '~/common/electron-service';
import {TRANSFER_HANDLER} from '~/common/index';
import type {LogInfo} from '~/common/node/file-storage/log-info';
import type {RemoteSecretErrorType} from '~/common/remote-secret';
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
            restartApp: this.restartApp.bind(this),
            getRemoteSecretLaunchParameter: this.getRemoteSecretLaunchParameter.bind(this),
            remoteSecretErrorRestartApp: this.remoteSecretErrorRestartApp.bind(this),
            remoteSecretSystemSuspensionRestartApp:
                this.remoteSecretSystemSuspensionRestartApp.bind(this),
            remoteSecretSystemSuspensionRestartParameter:
                this.getRemoteSecretSystemSuspensionRestartParameter.bind(this),
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
    public remoteSecretErrorRestartApp(errorType: RemoteSecretErrorType): void {
        window.app.remoteSecretErrorRestartApp(errorType);
    }

    /** @inheritdoc */
    public remoteSecretSystemSuspensionRestartApp(): void {
        window.app.remoteSecretSystemSuspensionRestartApp();
    }

    /** @inheritdoc */
    public getRemoteSecretLaunchParameter(): RemoteSecretErrorType | undefined {
        return window.app.getRemoteSecretLaunchParameter();
    }

    /** @inheritdoc */
    public getRemoteSecretSystemSuspensionRestartParameter(): boolean {
        return window.app.getRemoteSecretSystemSuspensionRestartParameter();
    }

    /** @inheritdoc */
    public showScreenSharingReminder(text: string, label: string): void {
        window.app.showScreenSharingReminder(text, label);
    }

    /** @inheritdoc */
    public closeScreenSharingReminder(): void {
        window.app.closeScreenSharingReminder();
    }

    /** @inheritdoc */
    public screenSharingSourceSelected(sourceId: string | undefined): void {
        window.app.screenSharingSourceSelected(sourceId);
    }

    /** @inheritdoc */
    public registerOnPresentScreenSharingPickerCallback(
        callback: (sources: ScreenSharingSource[]) => void,
    ): void {
        window.app.registerOnPresentScreenSharingPickerCallback(callback);
    }

    /** @inheritdoc */
    public registerOnScreenSharingStopCallback(callback: () => void): void {
        window.app.registerOnScreenSharingStopCallback(callback);
    }

    /** @inheritdoc */
    public registerOnMacosWindowCloseCallback(callback: () => void): void {
        window.app.registerOnMacosWindowCloseCallback(callback);
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
    /** @inheritdoc */
    public registerOnSuspendCallback(callback: () => Promise<void>): void {
        window.app.registerOnSuspendCallback(callback);
    }
}
