import type {SystemInfo} from '~/common/electron-ipc';
import type {BackendMediaService} from '~/common/media';

import type {Compressor} from './compressor';
import type {Config} from './config';
import type {CryptoBackend} from './crypto';
import type {INonceService} from './crypto/nonce';
import type {Device} from './device';
import type {FileStorage} from './file-storage';
import type {KeyStorage} from './key-storage';
import type {LoggerFactory} from './logging';
import type {Repositories} from './model';
import type {BlobBackend} from './network/protocol/blob';
import type {DirectoryBackend} from './network/protocol/directory';
import type {TaskManager} from './network/protocol/task/manager';
import type {NotificationService} from './notification';
import type {SystemDialogService} from './system-dialog';
import type {EndpointService, Remote} from './utils/endpoint';
import type {IViewModelRepository} from './viewmodel';

/**
 * Services available in the backend.
 */
export interface ServicesForBackend {
    readonly compressor: Compressor;
    readonly config: Config;
    readonly crypto: CryptoBackend;
    readonly device: Device;
    readonly directory: DirectoryBackend;
    readonly blob: BlobBackend;
    readonly endpoint: EndpointService;
    readonly file: FileStorage;
    readonly keyStorage: KeyStorage;
    readonly logging: LoggerFactory;
    readonly media: BackendMediaService;
    readonly model: Repositories;
    readonly nonces: INonceService;
    readonly notification: NotificationService;
    readonly viewModel: IViewModelRepository;
    readonly systemDialog: Remote<SystemDialogService>;
    readonly systemInfo: SystemInfo;
    readonly taskManager: TaskManager;
}

/**
 * Services that don't require an initialized identity before they can be instantiated.
 */
export type EarlyServices = Omit<
    ServicesForBackend,
    'device' | 'blob' | 'model' | 'nonces' | 'viewModel'
>;

/**
 * Early backend services that require neither an active identity nor a dynamic config for being
 * initialized.
 */
export type EarlyServicesThatRequireConfig = Pick<EarlyServices, 'directory' | 'file'>;

/**
 * Early backend services that don't require an active identity, but a dynamic config for being
 * initialized.
 */
export type EarlyServicesThatDontRequireConfig = Omit<
    EarlyServices,
    'config' | keyof EarlyServicesThatRequireConfig
>;

/**
 * Services available in the backend controller.
 */
export type ServicesForBackendController = Pick<ServicesForBackend, 'endpoint' | 'logging'> & {
    crypto: Pick<CryptoBackend, 'randomBytes'>;
};
