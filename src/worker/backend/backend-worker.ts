import Long from 'long';
import * as $protobuf from 'protobufjs/minimal';

import {type Config} from '~/common/config';
import {
    type BackendInit,
    type FactoriesForBackend,
    type SafeBackupSource,
    Backend,
} from '~/common/dom/backend';
import {createEndpointService} from '~/common/dom/utils/endpoint';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

import {BACKEND_WORKER_CONFIG} from './config';

declare const self: DedicatedWorkerGlobalScope;
export {};

/**
 * This is the common entrypoint for the backend worker, invoked by the app
 * via the specific 'web' or 'electron' loader entrypoints.
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

    const endpoint = createEndpointService({config, logging});
    const create = Object.assign(
        async (init: BackendInit, safeBackupSource?: SafeBackupSource) => {
            log.info('Creating backend');
            return await Backend.create(
                init,
                factories,
                {
                    config,
                    logging,
                    endpoint,
                },
                safeBackupSource,
            );
        },
        {
            [TRANSFER_MARKER]: PROXY_HANDLER,
        },
    );
    endpoint.expose(create, self, logging.logger('com.backend-creator'));
}
