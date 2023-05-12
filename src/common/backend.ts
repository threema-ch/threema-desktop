import {type Compressor} from './compressor';
import {type Config} from './config';
import {type CryptoBackend} from './crypto';
import {type Device} from './device';
import {type FileStorage} from './file-storage';
import {type LoggerFactory} from './logging';
import {type Repositories} from './model';
import {type BlobBackend} from './network/protocol/blob';
import {type DirectoryBackend} from './network/protocol/directory';
import {type TaskManager} from './network/protocol/task/manager';
import {type NotificationService} from './notification';
import {type SystemDialogService} from './system-dialog';
import {type EndpointService, type Remote} from './utils/endpoint';
import {type Timer} from './utils/timer';
import {type IViewModelRepository} from './viewmodel';

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
    readonly logging: LoggerFactory;
    readonly model: Repositories;
    readonly viewModel: IViewModelRepository;
    readonly notification: NotificationService;
    readonly systemDialog: Remote<SystemDialogService>;
    readonly taskManager: TaskManager;
    readonly timer: Timer;
}

/**
 * Services available in the backend controller.
 */
export type ServicesForBackendController = Pick<
    ServicesForBackend,
    'config' | 'endpoint' | 'logging' | 'timer'
> & {crypto: Pick<CryptoBackend, 'randomBytes'>};
