import {
    Backend,
    type BackendCreator,
    type BackendInit,
    type DeviceLinkingSetup,
    type FactoriesForBackend,
    type PinForwarder,
} from '~/common/dom/backend';
import {createEndpointService} from '~/common/dom/utils/endpoint';
import {
    type EndpointFor,
    PROXY_HANDLER,
    type ProxyMarked,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';
import {BACKEND_WORKER_CONFIG} from '~/worker/backend/config';

declare const self: DedicatedWorkerGlobalScope;

/**
 * This is the common entrypoint for the backend worker, invoked by the app
 * via the specific 'electron' loader entrypoint.
 */
export function main(factories: FactoriesForBackend): void {
    const logging = factories.logging('bw', BACKEND_WORKER_CONFIG.LOG_DEFAULT_STYLE);
    const log = logging.logger('main');

    // Greet with version!
    log.info(`Loaded worker: ${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_HASH})`);

    // The worker exposes backend creation functions that run in the context of the worker, but
    // which can be called from the main thread (through the backend controller).
    const endpoint = createEndpointService({logging});
    const services = {
        logging,
        endpoint,
    };

    const creator: BackendCreator & ProxyMarked = {
        hasIdentity: () => Backend.hasIdentity(factories, services),
        fromKeyStorage: async (
            init: BackendInit,
            keyStoragePassword: string,
            pinForwarder: EndpointFor<PinForwarder>,
        ) => {
            log.info('Creating backend from key storage');
            return await Backend.createFromKeyStorage(
                init,
                factories,
                services,
                keyStoragePassword,
                pinForwarder,
            );
        },
        fromDeviceJoin: async (
            init: BackendInit,
            deviceLinkingSetup: EndpointFor<DeviceLinkingSetup>,
            pinForwarder: EndpointFor<PinForwarder>,
        ) => {
            log.info('Creating backend from device join');
            return await Backend.createFromDeviceJoin(
                init,
                factories,
                services,
                deviceLinkingSetup,
                pinForwarder,
            );
        },
        [TRANSFER_HANDLER]: PROXY_HANDLER,
    };

    endpoint.exposeProxy(creator, self, logging.logger('com.backend-creator'));
}
