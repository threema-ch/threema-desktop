/**
 * The preload script runs in the renderer process, but – as long as
 * `contextIsolation` is enabled in electron – in a sandboxed environment
 * without access to the main application (and vice versa).
 *
 * For communication with the main process, IPC must be used.
 * For communication with the application, the contextBridge must be used.
 */
import {contextBridge, ipcRenderer} from 'electron';

import {type ElectronIpc, type ErrorDetails} from '~/common/electron-ipc';
import {ElectronIpcCommand} from '~/common/enum';
import {CONSOLE_LOGGER} from '~/common/logging';

const log = CONSOLE_LOGGER;

log.debug('Loaded preload script');

// The contextBridge allows us to safely expose APIs to the renderer process.
// See https://www.electronjs.org/docs/latest/api/context-bridge/ for details.
/* eslint-disable @typescript-eslint/promise-function-async */
const appApi: ElectronIpc = {
    reportError: (errorMessage: ErrorDetails) =>
        ipcRenderer.send(ElectronIpcCommand.ERROR, errorMessage),
    getAppPath: () => ipcRenderer.sendSync(ElectronIpcCommand.GET_APP_PATH),
    getSystemInfo: () => ipcRenderer.invoke(ElectronIpcCommand.GET_SYSTEM_INFO),
    logToFile: (level, data) => ipcRenderer.invoke(ElectronIpcCommand.LOG_TO_FILE, level, data),
    deleteProfileAndRestartApp: () =>
        ipcRenderer.send(ElectronIpcCommand.DELETE_PROFILE_AND_RESTART),
};
/* eslint-enable @typescript-eslint/promise-function-async */
contextBridge.exposeInMainWorld('app', appApi);
