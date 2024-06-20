/**
 * Types defined here are used from multiple components.
 *
 * Note: For types shared across the entire project, src/common/types.ts should be used instead.
 */
import type {Router} from '~/app/routing/router';
import type {CryptoBackend} from '~/common/crypto';
import type {BackendController} from '~/common/dom/backend/controller';
import type {BlobCacheService} from '~/common/dom/ui/blob-cache';
import type {LocalStorageController} from '~/common/dom/ui/local-storage';
import type {ProfilePictureService} from '~/common/dom/ui/profile-picture';
import type {WebRtcServiceProvider} from '~/common/dom/webrtc';
import type {SystemInfo} from '~/common/electron-ipc';
import type {LoggerFactory} from '~/common/logging';
import type {SettingsService} from '~/common/model/types/settings';
import type {SystemDialogService} from '~/common/system-dialog';

/**
 * Container for available services in the frontend.
 */
export interface AppServices {
    readonly crypto: Pick<CryptoBackend, 'randomBytes'>;
    readonly logging: LoggerFactory;
    readonly blobCache: BlobCacheService;
    readonly profilePicture: ProfilePictureService;
    readonly storage: LocalStorageController;
    readonly backend: BackendController;
    readonly router: Router;
    readonly systemDialog: SystemDialogService;
    readonly systemInfo: SystemInfo;
    readonly settings: SettingsService;
    readonly webRtc: WebRtcServiceProvider;
}

/**
 * Container for available services in UI components.
 */
export type AppServicesForSvelte = Omit<AppServices, 'backend'> & {
    // Re-include `backend`, but without `model` access.
    readonly backend: Omit<BackendController, 'model'>;
};

// TODO(DESK-339): Use SvelteAction when 3.47 is released
export interface SvelteAction {
    update?: () => void;
    destroy?: () => void;
}
