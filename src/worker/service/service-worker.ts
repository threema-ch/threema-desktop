import {CONFIG} from '~/common/config';
import {CONSOLE_LOGGER, type Logger, TagLogger} from '~/common/logging';

import {type FactoriesForServiceWorker} from '.';
import {type ResourceCache} from './cache';
import {NoopResourceCache} from './cache/noop';
import {SERVICE_WORKER_CONFIG} from './config';

/**
 * This is the common entrypoint for the service worker, invoked by the app
 * via the specific 'electron' loader entrypoint.
 */
declare const self: ServiceWorkerGlobalScope;
export {};

async function populate(cache: ResourceCache, log: Logger): Promise<void> {
    // Populate cache
    try {
        await cache.populate();
        log.debug('Cache populated');
    } catch (error) {
        log.error('Unable to populate cache:', error);
    }

    // Become active immediately
    await self.skipWaiting();
}

async function prune(cache: ResourceCache, log: Logger): Promise<void> {
    // Prune previous caches
    try {
        await cache.prune();
        log.debug('Cache pruned');
    } catch (error) {
        log.error('Unable to prune cache:', error);
    }

    // Claim the scope
    await self.clients.claim();
    log.info(
        `Service worker activated: ${import.meta.env.BUILD_VERSION} (${
            import.meta.env.BUILD_HASH
        })`,
    );
}

export function main(factories: FactoriesForServiceWorker): void {
    const logging = TagLogger.styled(CONSOLE_LOGGER, 'sw', SERVICE_WORKER_CONFIG.LOG_DEFAULT_STYLE);
    const log = logging.logger('main');
    const cache = factories.cache(logging.logger('cache'), CONFIG, SERVICE_WORKER_CONFIG);

    // Greet with build version!
    log.info(
        `Loaded service worker: ${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_HASH})`,
    );
    log.debug(`Using cache: ${cache.name}`);

    // Register service worker events
    self.addEventListener('install', (event: ExtendableEvent) => {
        log.info(
            `Installing service worker: ${import.meta.env.BUILD_VERSION} (${
                import.meta.env.BUILD_HASH
            })`,
        );
        event.waitUntil(populate(cache, log));
    });
    self.addEventListener('activate', (event: ExtendableEvent) => {
        event.waitUntil(prune(cache, log));
    });

    // Register fetch (if not a no-op cache)
    if (!(cache instanceof NoopResourceCache)) {
        self.addEventListener('fetch', (event: FetchEvent) => {
            // Only cache GET requests
            if (event.request.method !== 'GET') {
                return;
            }

            // Return the cached resource, if existing
            event.respondWith(cache.fetch(event));
        });
    }
}
