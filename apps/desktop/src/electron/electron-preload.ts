/**
 * The preload script runs in the renderer process, but – as long as
 * `contextIsolation` is enabled in electron – in a sandboxed environment
 * without access to the main application (and vice versa).
 *
 * For communication with the main process, IPC must be used.
 * For communication with the application, the contextBridge must be used.
 */
import type {u53} from '@threema/ts-utils/integer/u53';
// eslint-disable-next-line import/no-extraneous-dependencies
import {contextBridge, ipcRenderer} from 'electron';

import type {
    DeleteProfileOptions,
    ElectronIpc,
    ErrorDetails,
    ScreenSharingSource,
} from '~/common/electron-ipc';
import {ElectronIpcCommand} from '~/common/enum';
import {CONSOLE_LOGGER} from '~/common/logging';
import type {RemoteSecretErrorType} from '~/common/remote-secret';
import type {DomainCertificatePin} from '~/common/types';

const log = CONSOLE_LOGGER;

log.debug('Loaded preload script');

// The contextBridge allows us to safely expose APIs to the renderer process.
// See https://www.electronjs.org/docs/latest/api/context-bridge/ for details.
//
// Instead of exposing the full API object permanently on `window`, we expose a
// one-time factory function. The `consumed` flag lives in this preload closure
// and is therefore inaccessible from the renderer context. After the factory
// has been called once (by ElectronIpcService during app startup), subsequent
// calls return undefined, reducing the permanently-exposed attack surface on window.
let consumed = false;

/* eslint-disable @typescript-eslint/promise-function-async */
contextBridge.exposeInMainWorld('consumeElectronApi', (): ElectronIpc | undefined => {
    if (consumed) {
        log.warn('consumeElectronApi() already consumed');
        return undefined;
    }
    consumed = true;
    return {
        reportError: (errorMessage: ErrorDetails) =>
            ipcRenderer.send(ElectronIpcCommand.ERROR, errorMessage),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        getAppPath: () => ipcRenderer.sendSync(ElectronIpcCommand.GET_APP_PATH),
        getSystemInfo: () => ipcRenderer.invoke(ElectronIpcCommand.GET_SYSTEM_INFO),
        logToFile: (level, data) => ipcRenderer.invoke(ElectronIpcCommand.LOG_TO_FILE, level, data),
        isFileLoggingEnabled: () => ipcRenderer.invoke(ElectronIpcCommand.IS_FILE_LOGGING_ENABLED),
        clearLogFiles: () => ipcRenderer.invoke(ElectronIpcCommand.CLEAR_LOG_FILES),
        getLogInformation: () => ipcRenderer.invoke(ElectronIpcCommand.GET_LOG_INFORMATION),
        getGzippedLogFiles: () => ipcRenderer.invoke(ElectronIpcCommand.GET_GZIPPED_LOG_FILE),
        setFileLoggingEnabledAndRestart: (enabled) =>
            ipcRenderer.send(ElectronIpcCommand.SET_FILE_LOGGING_ENABLED_AND_RESTART, enabled),
        deleteProfileAndRestartApp: (options: DeleteProfileOptions) =>
            ipcRenderer.send(ElectronIpcCommand.DELETE_PROFILE_AND_RESTART, options),
        restartApp: () => ipcRenderer.send(ElectronIpcCommand.RESTART_APP),
        restartAppAndInstallUpdate: () =>
            ipcRenderer.send(ElectronIpcCommand.RESTART_APP_AND_INSTALL_UPDATE),
        isSpellcheckEnabled: () => ipcRenderer.invoke(ElectronIpcCommand.GET_SPELLCHECK),
        setSpelleckEnabledAndRestart: (enabled) =>
            ipcRenderer.send(ElectronIpcCommand.SET_SPELLCHECK, enabled),
        closeApp: () => ipcRenderer.send(ElectronIpcCommand.CLOSE_APP),
        removeOldProfiles: () => ipcRenderer.send(ElectronIpcCommand.REMOVE_OLD_PROFILES),
        getLatestProfilePath: () =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            ipcRenderer.sendSync(ElectronIpcCommand.GET_LATEST_PROFILE_PATH),
        updateAppBadge: (totalUnreadMessageCount: u53) =>
            ipcRenderer.send(ElectronIpcCommand.UPDATE_APP_BADGE, totalUnreadMessageCount),
        updatePublicKeyPins: (publicKeyPins: DomainCertificatePin[]) =>
            ipcRenderer.invoke(ElectronIpcCommand.UPDATE_PUBLIC_KEY_PINS, publicKeyPins),
        getTestData: () => ipcRenderer.invoke(ElectronIpcCommand.GET_TEST_DATA),
        loadUserPassword: () => ipcRenderer.invoke(ElectronIpcCommand.LOAD_USER_PASSWORD),
        storeUserPassword: (password) =>
            ipcRenderer.invoke(ElectronIpcCommand.STORE_USER_PASSWORD, password),
        remoteSecretErrorRestartApp: (errorType: RemoteSecretErrorType) =>
            ipcRenderer.send(ElectronIpcCommand.REMOTE_SECRET_ERROR_RESTART_APP, errorType),
        remoteSecretSystemSuspensionRestartApp: () => {
            ipcRenderer.send(ElectronIpcCommand.REMOTE_SECRET_SYSTEM_SUSPENSION_RESTART_APP);
        },
        getRemoteSecretLaunchParameter: () =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            ipcRenderer.sendSync(ElectronIpcCommand.GET_REMOTE_SECRET_ERROR_LAUNCH_PARAMETER),
        getRemoteSecretSystemSuspensionRestartParameter: () =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            ipcRenderer.sendSync(
                ElectronIpcCommand.GET_REMOTE_SECRET_SYSTEM_SUSPENSION_LAUNCH_PARAMETER,
            ),
        showScreenSharingReminder: (text: string, label: string) =>
            ipcRenderer.send(ElectronIpcCommand.SCREEN_SHARING_SHOW_REMINDER, text, label),
        closeScreenSharingReminder: () =>
            ipcRenderer.send(ElectronIpcCommand.SCREEN_SHARING_CLOSE_REMINDER),
        screenSharingSourceSelected: (sourceId: string | undefined) =>
            ipcRenderer.send(ElectronIpcCommand.SCREEN_SHARING_SCREEN_SELECTED, sourceId),
        registerOnPresentScreenSharingPickerCallback: (
            callback: (sources: ScreenSharingSource[]) => void,
        ) =>
            ipcRenderer.on(
                ElectronIpcCommand.SCREEN_SHARING_PRESENT_PICKER,
                (_, sources: ScreenSharingSource[]) => callback(sources),
            ),
        registerOnScreenSharingStopCallback: (callback: () => void) =>
            ipcRenderer.on(ElectronIpcCommand.SCREEN_SHARING_STOP, () => callback()),
        registerOnSuspendCallback: (callback: () => void) =>
            ipcRenderer.on(ElectronIpcCommand.SYSTEM_SUSPENDING, () => callback()),
        checkOppFile: (oppfUrl: string, username: string, password: string, userAgent: string) =>
            ipcRenderer.invoke(
                ElectronIpcCommand.CHECK_OPP_FILE,
                oppfUrl,
                username,
                password,
                userAgent,
            ),
        getOppFile: (oppfUrl: string, username: string, password: string, userAgent: string) =>
            ipcRenderer.invoke(
                ElectronIpcCommand.GET_OPP_FILE,
                oppfUrl,
                username,
                password,
                userAgent,
            ),
        registerInvalidCertificatePins: (callback: () => void) =>
            ipcRenderer.on(ElectronIpcCommand.ON_FALLBACK_OPPF, () => callback()),
        checkFallbackOppFile: (oppfUrl: string, userAgent: string) =>
            ipcRenderer.invoke(ElectronIpcCommand.CHECK_FALLBACK_OPP_FILE, oppfUrl, userAgent),
        getFallbackOppFile: (oppfUrl: string, userAgent: string) =>
            ipcRenderer.invoke(ElectronIpcCommand.GET_FALLBACK_OPP_FILE, oppfUrl, userAgent),
        beforeRestart: () => ipcRenderer.invoke(ElectronIpcCommand.BEFORE_RESTART),
        triggerInvalidCertificatePins: () =>
            ipcRenderer.invoke(ElectronIpcCommand.TRIGGER_INVALID_CERTIFICATE_PINS),
        signalRestartReady: () => ipcRenderer.invoke(ElectronIpcCommand.SIGNAL_RESTART_READY),
        openWebRtcInternals: () => ipcRenderer.send(ElectronIpcCommand.OPEN_WEBRTC_INTERNALS),
    };
});
/* eslint-enable @typescript-eslint/promise-function-async */
