import {type Config} from '~/common/config';
import {type Logger} from '~/common/logging';

import {type ResourceCache} from './cache';
import {type ServiceWorkerConfig} from './config';

/**
 * Factories needed for a service worker.
 */
export interface FactoriesForServiceWorker {
    cache: (
        log: Logger,
        commonConfig: Config,
        serviceWorkerConfig: ServiceWorkerConfig,
    ) => ResourceCache;
}
