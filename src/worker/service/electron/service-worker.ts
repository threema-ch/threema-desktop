import {NoopResourceCache} from '~/worker/service/cache/noop';
import {main} from '~/worker/service/service-worker';

// Start service worker for Electron
main({
    cache: () => new NoopResourceCache(),
});
