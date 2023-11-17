/**
 * The preload script runs in the renderer process, but – as long as
 * `contextIsolation` is enabled in electron – in a sandboxed environment
 * without access to the main application (and vice versa).
 *
 * For communication with the main process, IPC must be used.
 * For communication with the application, the contextBridge must be used.
 */
// eslint-disable-next-line import/no-extraneous-dependencies
import {contextBridge, ipcRenderer} from 'electron';

import type {ElectronIpc, ErrorDetails} from '~/common/electron-ipc';
import {ElectronIpcCommand} from '~/common/enum';
import {CONSOLE_LOGGER} from '~/common/logging';
import type {u53} from '~/common/types';

const log = CONSOLE_LOGGER;

log.debug('Loaded preload script');

// The contextBridge allows us to safely expose APIs to the renderer process.
// See https://www.electronjs.org/docs/latest/api/context-bridge/ for details.
/* eslint-disable @typescript-eslint/promise-function-async */
const appApi: ElectronIpc = {
    reportError: (errorMessage: ErrorDetails) =>
        ipcRenderer.send(ElectronIpcCommand.ERROR, errorMessage),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getAppPath: () => ipcRenderer.sendSync(ElectronIpcCommand.GET_APP_PATH),
    getSystemInfo: () => ipcRenderer.invoke(ElectronIpcCommand.GET_SYSTEM_INFO),
    logToFile: (level, data) => ipcRenderer.invoke(ElectronIpcCommand.LOG_TO_FILE, level, data),
    isFileLoggingEnabled: () => ipcRenderer.invoke(ElectronIpcCommand.IS_FILE_LOGGING_ENABLED),
    getLogInformation: () => ipcRenderer.invoke(ElectronIpcCommand.GET_LOG_INFORMATION),
    setFileLoggingEnabledAndRestart: (enabled) =>
        ipcRenderer.send(ElectronIpcCommand.SET_FILE_LOGGING_ENABLED_AND_RESTART, enabled),
    deleteProfileAndRestartApp: () =>
        ipcRenderer.send(ElectronIpcCommand.DELETE_PROFILE_AND_RESTART),
    closeApp: () => ipcRenderer.send(ElectronIpcCommand.CLOSE_APP),
    updateAppBadge: (totalUnreadMessageCount: u53) =>
        ipcRenderer.send(ElectronIpcCommand.UPDATE_APP_BADGE, totalUnreadMessageCount),
};
/* eslint-enable @typescript-eslint/promise-function-async */
contextBridge.exposeInMainWorld('app', appApi);
