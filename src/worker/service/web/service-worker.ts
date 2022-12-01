import {CacheStorageResourceCache} from '~/worker/service/cache/cache-storage';
import {main} from '~/worker/service/service-worker';

// Start service worker for web
main({
    cache: (log, commonConfig, serviceWorkerConfig) =>
        new CacheStorageResourceCache(log, commonConfig, serviceWorkerConfig),
});
