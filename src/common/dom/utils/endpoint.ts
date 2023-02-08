import {type ServicesForBackend} from '~/common/backend';
import {type u53} from '~/common/types';
import {
    type DebugObjectCacheCounter,
    type Endpoint,
    type EndpointPairFor,
    EndpointService,
    LocalObjectMapper,
    type ObjectCache,
    type ObjectId,
    RemoteObjectMapper,
    type TransferMarked,
} from '~/common/utils/endpoint';

/**
 * Convenience wrapper to create a channel (pair of ports) for a specific
 * endpoint.
 */
function createChannel<TTarget>(): EndpointPairFor<TTarget, MessagePort & Endpoint> {
    const {port1: local, port2: remote} = new MessageChannel();
    return {local, remote} as EndpointPairFor<TTarget, MessagePort & Endpoint>;
}

/**
 * Create an endpoint service instance with all of the transfer handlers we're
 * using.
 */
export function createEndpointService(
    services: Pick<ServicesForBackend, 'config' | 'logging'>,
): EndpointService {
    let counter: DebugObjectCacheCounter | undefined;
    if (import.meta.env.DEBUG) {
        const counters = new Map<ObjectId<unknown>, u53>();
        counter = {
            get: (id): u53 => {
                let count = counters.get(id) ?? 0;
                counters.set(id, ++count);
                return count;
            },
        };
    }

    // Caches local/remote store mappings by giving them unique IDs.
    //
    // This allows us to avoid duplication of traffic from the same local store
    // instance to remote stores. Instead, the mapping will be reused (i.e. the
    // same remote store instance for a local store instance).
    //
    // Note that the cache contains weak references, so any mapping automatically
    // expires when no references remain.
    //
    // Note also that we can safely use the cache for any kind of object
    // instance since the assigned IDs are always unique in that case.
    const cache: ObjectCache<TransferMarked, object> = {
        local: new LocalObjectMapper(),
        remote: new RemoteObjectMapper(),
        counter,
    };

    return new EndpointService(services, createChannel, cache);
}
