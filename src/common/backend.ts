import type {Compressor} from '~/common/compressor';
import type {Config} from '~/common/config';
import type {CryptoBackend} from '~/common/crypto';
import type {INonceService} from '~/common/crypto/nonce';
import type {Device} from '~/common/device';
import type {SystemInfo} from '~/common/electron-ipc';
import type {FileStorage} from '~/common/file-storage';
import type {KeyStorage} from '~/common/key-storage';
import type {LoggerFactory} from '~/common/logging';
import type {BackendMediaService} from '~/common/media';
import type {Repositories} from '~/common/model';
import type {BlobBackend} from '~/common/network/protocol/blob';
import type {DirectoryBackend} from '~/common/network/protocol/directory';
import type {TaskManager} from '~/common/network/protocol/task/manager';
import type {VolatileProtocolState} from '~/common/network/protocol/volatile-protocol-state';
import type {WorkBackend} from '~/common/network/protocol/work';
import type {NotificationService} from '~/common/notification';
import type {SystemDialogService} from '~/common/system-dialog';
import type {EndpointService, Remote} from '~/common/utils/endpoint';
import type {IViewModelRepository} from '~/common/viewmodel';

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
    readonly systemDialog: Remote<SystemDialogService>;
    readonly systemInfo: SystemInfo;
    readonly taskManager: TaskManager;
    readonly viewModel: IViewModelRepository;
    readonly volatileProtocolState: VolatileProtocolState;
    readonly work: WorkBackend;
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
    'config' | 'work' | keyof EarlyServicesThatRequireConfig
>;

/**
 * Services available in the backend controller.
 */
export type ServicesForBackendController = Pick<ServicesForBackend, 'endpoint' | 'logging'> & {
    crypto: Pick<CryptoBackend, 'randomBytes'>;
};
