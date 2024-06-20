import type {ServicesForBackend} from '~/common/backend';
import type {u53} from '~/common/types';
import {
    type CustomTransferable,
    type DebugObjectCacheCounter,
    type EndpointPairFor,
    EndpointService,
    LocalObjectMapper,
    type ObjectCache,
    type ObjectId,
    RemoteObjectMapper,
    type ProxyMarked,
    type ProxyEndpointPair,
    type Endpoint,
    type ProxyEndpoint,
    type EndpointFor,
} from '~/common/utils/endpoint';
import {AbortRaiser} from '~/common/utils/signal';

/**
 * Ensures that the provided endpoint is compatible with the {@link EndpointService}.
 */
export function ensureEndpoint<TTarget extends ProxyMarked>(
    endpoint: Omit<Endpoint<unknown, unknown>, 'postMessage'>,
): ProxyEndpoint<TTarget>;
export function ensureEndpoint<TTarget, TLocalMessage, TRemoteMessage>(
    endpoint: Omit<Endpoint<unknown, unknown>, 'postMessage'>,
): EndpointFor<TTarget, TLocalMessage, TRemoteMessage>;
export function ensureEndpoint(
    endpoint: Omit<Endpoint<unknown, unknown>, 'postMessage'>,
): ProxyEndpoint<ProxyMarked> | EndpointFor<unknown, unknown, unknown> {
    // The `postMessage` type is a bit wonky for the DOM APIs, so we'll simply declare allowed
    // instances here.
    if (
        !(
            endpoint instanceof MessagePort ||
            endpoint instanceof Worker ||
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
            // @ts-ignore: We sometimes run this in a WebWorker context, sometimes in a DOM context
            // and it's our only proper way to check it
            (typeof WorkerGlobalScope !== 'undefined' && endpoint instanceof WorkerGlobalScope) ||
            (typeof Window !== 'undefined' && endpoint instanceof Window)
        )
    ) {
        throw new Error(`EndpointService does not accept the endpoint type '${typeof endpoint}'`);
    }
    return endpoint as unknown as
        | ProxyEndpoint<ProxyMarked>
        | EndpointFor<unknown, unknown, unknown>;
}

/**
 * Create an endpoint service instance with all of the transfer handlers we're
 * using.
 */
export function createEndpointService(
    services: Pick<ServicesForBackend, 'logging'>,
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
    const cache: ObjectCache<CustomTransferable, object> = {
        local: new LocalObjectMapper(),
        remote: new RemoteObjectMapper(),
        counter,
    };

    return new EndpointService(
        services,
        () => new AbortRaiser(),
        <TTarget, TLocalMessage, TRemoteMessage>() => {
            const {port1: local, port2: remote} = new MessageChannel();
            return {local, remote} as unknown as TTarget extends ProxyMarked
                ? ProxyEndpointPair<TTarget>
                : EndpointPairFor<TTarget, TLocalMessage, TRemoteMessage>;
        },
        cache,
    );
}
