import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {u53} from '@threema/ts-utils/integer/u53';

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
import type {DomainCertificatePin} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import type {PlaywrightIpcService} from '~/test/playwright/common/types/electron-fixture';

// Extend global APIs
//
// TODO(DESK-684): Consider using comlink/endpoint for IPC communication
declare global {
    interface Window {
        /**
         * One-time factory exposed by the preload script via contextBridge. Returns the
         * {@link ElectronIpc} instance on the first call and undefined on every subsequent call.
         * The consumed flag lives in the preload closure and cannot be reset from the renderer.
         */
        readonly consumeElectronApi: () => ElectronIpc | undefined;
        playwrightElectronService: PlaywrightIpcService | undefined;
    }
}

export class ElectronIpcService implements ElectronIpc {
    public readonly frontendHandle: IFrontendElectronService;
    private readonly _api: ElectronIpc;

    public constructor() {
        const api = window.consumeElectronApi();
        this._api = unwrap(api, 'ElectronIpcService: consumeElectronApi() already consumed');

        if (import.meta.env.BUILD_MODE === 'testing') {
            window.playwrightElectronService = {
                updatePublicKeyPins: this.updatePublicKeyPins.bind(this),
            };
        } else {
            window.playwrightElectronService = undefined;
        }

        this.frontendHandle = {
            [TRANSFER_HANDLER]: PROXY_HANDLER,
            updatePublicKeyPins: this.updatePublicKeyPins.bind(this),
            removeOldProfiles: this.removeOldProfiles.bind(this),
            restartAppAndInstallUpdate: this.restartAppAndInstallUpdate.bind(this),
            restartApp: this.restartApp.bind(this),
            getRemoteSecretLaunchParameter: this.getRemoteSecretLaunchParameter.bind(this),
            remoteSecretErrorRestartApp: this.remoteSecretErrorRestartApp.bind(this),
            logToFile: this.logToFile.bind(this),
            remoteSecretSystemSuspensionRestartApp:
                this.remoteSecretSystemSuspensionRestartApp.bind(this),
            beforeRestart: this.beforeRestart.bind(this),
            remoteSecretSystemSuspensionRestartParameter:
                this.getRemoteSecretSystemSuspensionRestartParameter.bind(this),
            checkOppFile: this.checkOppFile.bind(this),
            getOppFile: this.getOppFile.bind(this),
            checkFallbackOppFile: this.checkFallbackOppFile.bind(this),
            getFallbackOppFile: this.getFallbackOppFile.bind(this),
            registerInvalidCertificatePins: this.registerInvalidCertificatePins.bind(this),
            triggerInvalidCertificatePins: this.triggerInvalidCertificatePins.bind(this),
            signalRestartReady: this.signalRestartReady.bind(this),
        };
    }

    /** @inheritdoc */
    public async clearLogFiles(): Promise<void> {
        await this._api.clearLogFiles();
    }

    /** @inheritdoc */
    public closeApp(): void {
        this._api.closeApp();
    }

    /** @inheritdoc */
    public deleteProfileAndRestartApp(options: DeleteProfileOptions): void {
        this._api.deleteProfileAndRestartApp(options);
    }

    /** @inheritdoc */
    public getAppPath(): string {
        return this._api.getAppPath();
    }

    /** @inheritdoc */
    public async getGzippedLogFiles(): Promise<{
        app?: ReadonlyUint8Array;
        bw?: ReadonlyUint8Array;
    }> {
        return await this._api.getGzippedLogFiles();
    }

    /** @inheritdoc */
    public getLatestProfilePath(): string | undefined {
        return this._api.getLatestProfilePath();
    }

    /** @inheritdoc */
    public async getLogInformation(): Promise<LogInfo> {
        return await this._api.getLogInformation();
    }

    /** @inheritdoc */
    public async getSystemInfo(): Promise<SystemInfo> {
        return await this._api.getSystemInfo();
    }

    /** @inheritdoc */
    public async getTestData(): Promise<string | undefined> {
        return await this._api.getTestData();
    }

    /** @inheritdoc */
    public async isFileLoggingEnabled(): Promise<boolean | undefined> {
        return await this._api.isFileLoggingEnabled();
    }

    /** @inheritdoc */
    public async isSpellcheckEnabled(): Promise<boolean | undefined> {
        return await this._api.isSpellcheckEnabled();
    }

    /** @inheritdoc */
    public async loadUserPassword(): Promise<string | undefined> {
        return await this._api.loadUserPassword();
    }

    /** @inheritdoc */
    public async logToFile(
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
        data: string,
    ): Promise<void> {
        await this._api.logToFile(level, data);
    }

    /** @inheritdoc */
    public removeOldProfiles(): void {
        this._api.removeOldProfiles();
    }

    /** @inheritdoc */
    public reportError(error: ErrorDetails): void {
        this._api.reportError(error);
    }

    /** @inheritdoc */
    public restartApp(): void {
        this._api.restartApp();
    }

    /** @inheritdoc */
    public restartAppAndInstallUpdate(): void {
        this._api.restartAppAndInstallUpdate();
    }

    /** @inheritdoc */
    public setFileLoggingEnabledAndRestart(enabled: boolean): void {
        this._api.setFileLoggingEnabledAndRestart(enabled);
    }

    /** @inheritdoc */
    public setSpelleckEnabledAndRestart(enabled: boolean): void {
        this._api.setSpelleckEnabledAndRestart(enabled);
    }

    /** @inheritdoc */
    public async storeUserPassword(password: string): Promise<boolean> {
        return await this._api.storeUserPassword(password);
    }

    /** @inheritdoc */
    public remoteSecretErrorRestartApp(errorType: RemoteSecretErrorType): void {
        this._api.remoteSecretErrorRestartApp(errorType);
    }

    /** @inheritdoc */
    public remoteSecretSystemSuspensionRestartApp(): void {
        this._api.remoteSecretSystemSuspensionRestartApp();
    }

    /** @inheritdoc */
    public getRemoteSecretLaunchParameter(): RemoteSecretErrorType | undefined {
        return this._api.getRemoteSecretLaunchParameter();
    }

    /** @inheritdoc */
    public getRemoteSecretSystemSuspensionRestartParameter(): boolean {
        return this._api.getRemoteSecretSystemSuspensionRestartParameter();
    }

    /** @inheritdoc */
    public showScreenSharingReminder(text: string, label: string): void {
        this._api.showScreenSharingReminder(text, label);
    }

    /** @inheritdoc */
    public closeScreenSharingReminder(): void {
        this._api.closeScreenSharingReminder();
    }

    /** @inheritdoc */
    public screenSharingSourceSelected(sourceId: string | undefined): void {
        this._api.screenSharingSourceSelected(sourceId);
    }

    /** @inheritdoc */
    public registerOnPresentScreenSharingPickerCallback(
        callback: (sources: ScreenSharingSource[]) => void,
    ): void {
        this._api.registerOnPresentScreenSharingPickerCallback(callback);
    }

    /** @inheritdoc */
    public registerOnScreenSharingStopCallback(callback: () => void): void {
        this._api.registerOnScreenSharingStopCallback(callback);
    }

    /** @inheritdoc */
    public updateAppBadge(totalUnreadMessageCount: u53): void {
        this._api.updateAppBadge(totalUnreadMessageCount);
    }

    /** @inheritdoc */
    public async updatePublicKeyPins(
        publicKeyPins: DomainCertificatePin[] | undefined,
    ): Promise<boolean> {
        // Always call the IPC handler, even when the OPPF has no `domains` field. The handler is
        // responsible for unblocking network requests, so skipping it when pins are absent would
        // leave all external requests permanently blocked.
        return await this._api.updatePublicKeyPins(publicKeyPins ?? []);
    }

    /** @inheritdoc */
    public registerOnSuspendCallback(callback: () => Promise<void>): void {
        this._api.registerOnSuspendCallback(callback);
    }

    /** @inheritdoc */
    public async checkOppFile(
        oppfUrl: string,
        username: string,
        password: string,
        userAgent: string,
    ): Promise<u53> {
        return await this._api.checkOppFile(oppfUrl, username, password, userAgent);
    }

    /** @inheritdoc */
    public async getOppFile(
        oppfUrl: string,
        username: string,
        password: string,
        userAgent: string,
    ): Promise<ArrayBuffer> {
        return await this._api.getOppFile(oppfUrl, username, password, userAgent);
    }

    /** @inheritdoc */
    public registerInvalidCertificatePins(callback: () => Promise<void>): void {
        this._api.registerInvalidCertificatePins(callback);
    }

    /** @inheritdoc */
    public async triggerInvalidCertificatePins(): Promise<void> {
        return await this._api.triggerInvalidCertificatePins();
    }

    /** @inheritdoc */
    public async checkFallbackOppFile(oppfUrl: string, userAgent: string): Promise<u53> {
        return await this._api.checkFallbackOppFile(oppfUrl, userAgent);
    }

    /** @inheritdoc */
    public async getFallbackOppFile(oppfUrl: string, userAgent: string): Promise<ArrayBuffer> {
        return await this._api.getFallbackOppFile(oppfUrl, userAgent);
    }

    /** @inheritdoc */
    public async beforeRestart(): Promise<void> {
        return await this._api.beforeRestart();
    }

    /** @inheritdoc */
    public async signalRestartReady(): Promise<void> {
        return await this._api.signalRestartReady();
    }

    /** @inheritdoc */
    public openWebRtcInternals(): void {
        return this._api.openWebRtcInternals();
    }
}
