import type {DomainCertificatePin} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

/**
 * Exposes functions that require communication with the electron main thread through the electron IPC.
 *
 * Lives in the frontend thread.
 */
export interface IFrontendElectronService extends ProxyMarked {
    /**
     * Forwards domain certificate pins to the main thread to register them in the current session.
     */
    readonly updatePublicKeyPins: (newPins: DomainCertificatePin[] | undefined) => void;
    /**
     * Remove all old profiles from the file system.
     */
    readonly removeOldProfiles: () => void;
    /**
     * Restart the app and install an update.
     */
    readonly restartAppAndInstallUpdate: () => void;
}
