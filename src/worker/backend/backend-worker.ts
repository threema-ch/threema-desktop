import Long from 'long';
import * as $protobuf from 'protobufjs/minimal';

import {type Config} from '~/common/config';
import {
    Backend,
    type BackendCreator,
    type BackendInit,
    type DeviceLinkingSetup,
    type FactoriesForBackend,
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
export {};

/**
 * This is the common entrypoint for the backend worker, invoked by the app
 * via the specific 'electron' loader entrypoint.
 */
export function main(config: Config, factories: FactoriesForBackend): void {
    const logging = factories.logging('bw', BACKEND_WORKER_CONFIG.LOG_DEFAULT_STYLE);
    const log = logging.logger('main');

    // Greet with version!
    log.info(`Loaded worker: ${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_HASH})`);

    // Initialize Protobuf Library
    $protobuf.util.Long = Long;
    $protobuf.configure();
    log.debug('Initialized protobufjs');

    // The worker exposes backend creation functions that run in the context of the worker, but
    // which can be called from the main thread (through the backend controller).
    const endpoint = createEndpointService({config, logging});
    const services = {
        config,
        logging,
        endpoint,
    };

    const creator: BackendCreator & ProxyMarked = {
        hasIdentity: () => Backend.hasIdentity(factories, services),
        fromKeyStorage: async (init: BackendInit, keyStoragePassword: string) => {
            log.info('Creating backend from key storage');
            return await Backend.createFromKeyStorage(
                init,
                factories,
                services,
                keyStoragePassword,
            );
        },
        fromDeviceJoin: async (
            init: BackendInit,
            deviceLinkingSetup: EndpointFor<DeviceLinkingSetup>,
        ) => {
            log.info('Creating backend from device join');
            return await Backend.createFromDeviceJoin(
                init,
                factories,
                services,
                deviceLinkingSetup,
            );
        },
        [TRANSFER_HANDLER]: PROXY_HANDLER,
    };

    endpoint.exposeProxy(creator, self, logging.logger('com.backend-creator'));
}
