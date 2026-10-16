import * as os from 'node:os';

import type {SystemInfo} from '~/common/electron-ipc';
import type {IFrontendElectronService} from '~/common/electron-service';
import type {ServicesForKeyStorage} from '~/common/key-storage';
import {CONSOLE_LOGGER, type LoggerFactory} from '~/common/logging';
import type {Remote} from '~/common/utils/endpoint';

function createThrowingStubFor(serviceName: string, methodName: string): () => void {
    return () => {
        throw new Error(
            `Method "${methodName}" is not implemented for service ${serviceName} in CLI`,
        );
    };
}

const electron = {
    removeOldProfiles: createThrowingStubFor('electron', 'removeOldProfiles'),
    restartAppAndInstallUpdate: createThrowingStubFor('electron', 'restartAppAndInstallUpdate'),
    updatePublicKeyPins: createThrowingStubFor('electron', 'updatePublicKeyPins'),
} as unknown as Remote<IFrontendElectronService>;

const logging: LoggerFactory = {
    logger: () => CONSOLE_LOGGER,
};

const systemInfo: SystemInfo = {
    os: 'other',
    arch: process.arch,
    osVersion: os.version(),
    osRelease: os.release(),
    locale: 'de_CH.utf8',
    isSafeStorageAvailable: false,
};

/**
 * Non-critical stub services to create a `FileSystemKeyStorage`. Important: These services are not
 * supposed to work as intended (or at all), and should not be used in the critical path needed for
 * the CLI to work.
 *
 * @deprecated Do not use unless you know you need it!
 */
export const cliStubServicesForKeyStorage: Omit<ServicesForKeyStorage, 'crypto'> = {
    electron,
    logging,
    systemInfo,
};
