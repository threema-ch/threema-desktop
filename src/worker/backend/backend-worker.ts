import {
    Backend,
    type BackendCreator,
    type BackendInit,
    type DeviceLinkingSetup,
    type FactoriesForBackend,
    type LoadingStateSetup,
    type OldProfileRemover,
    type PinForwarder,
} from '~/common/dom/backend';
import {createEndpointService, ensureEndpoint} from '~/common/dom/utils/endpoint';
import {extractErrorTraceback} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import type {TestDataJson} from '~/common/test-data';
import {setAssertFailLogger} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyEndpoint} from '~/common/utils/endpoint';
import {BACKEND_WORKER_CONFIG} from '~/worker/backend/config';

declare const self: DedicatedWorkerGlobalScope;

/**
 * This is the common entrypoint for the backend worker, invoked by the app
 * via the specific 'electron' loader entrypoint.
 */
export function main(factories: FactoriesForBackend): void {
    const logging = factories.logging('bw', BACKEND_WORKER_CONFIG.LOG_DEFAULT_STYLE);
    {
        const assertFailLogger = logging.logger('assert');
        setAssertFailLogger((error) => assertFailLogger.error(extractErrorTraceback(error)));
    }
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

    const creator: BackendCreator = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        hasIdentity: () => Backend.hasIdentity(factories, services),
        fromKeyStorage: async (
            init: BackendInit,
            keyStoragePassword: string,
            pinForwarder: ProxyEndpoint<PinForwarder>,
            loadingStateSetup: ProxyEndpoint<LoadingStateSetup>,
        ) => {
            log.info('Creating backend from key storage');
            return await Backend.createFromKeyStorage(
                init,
                factories,
                services,
                keyStoragePassword,
                pinForwarder,
                loadingStateSetup,
            );
        },
        fromDeviceJoin: async (
            init: BackendInit,
            deviceLinkingSetup: ProxyEndpoint<DeviceLinkingSetup>,
            pinForwarder: ProxyEndpoint<PinForwarder>,
            oldProfileRemover: ProxyEndpoint<OldProfileRemover>,
            shouldRestoreOldMessages: boolean,
        ) => {
            log.info('Creating backend from device join');
            return await Backend.createFromDeviceJoin(
                init,
                factories,
                services,
                deviceLinkingSetup,
                pinForwarder,
                oldProfileRemover,
                shouldRestoreOldMessages,
            );
        },
        fromTestConfiguration: async (
            init: BackendInit,
            pinForwarder: ProxyEndpoint<PinForwarder>,
            loadingStateSetup: ProxyEndpoint<LoadingStateSetup>,
            testData: TestDataJson,
        ) => {
            log.info('Creating backend from test configuration');
            return await Backend.createFromTestConfiguration(
                init,
                factories,
                services,
                pinForwarder,
                loadingStateSetup,
                testData,
            );
        },
    };

    endpoint.exposeProxy(creator, ensureEndpoint(self), logging.logger('com.backend-creator'));
}
