/**
 * Fetch strategy for HTTP GET requests.
 */
export type FetchStrategy =
    /**
     * Fetch from the network only.
     */
    | 'network-only'

    /**
     * Fetch from the network first, then fall back to the cache.
     */
    | 'network-then-cache'

    /**
     * Fetch from the cache first, then fall back to the network.
     */
    | 'cache-then-network';

/**
 * Storage strategy for responses to HTTP GET requests.
 */
export type CacheStrategy =
    /**
     * Do not store the response.
     */
    | 'discard'

    /**
     * Store the response.
     */
    | 'store';

/**
 * Source of a resource from a fetch.
 */
export type FetchSource =
    /**
     * Resource fetched from the network.
     */
    | 'network'

    /**
     * Resource fetched from the cache.
     */
    | 'cache';

/**
 * A result returned by a successful fetch.
 */
export interface FetchResult {
    /**
     * Source from which the resource has been fetched.
     */
    source: FetchSource;

    /**
     * The HTTP response.
     */
    response: Response;
}

/**
 * Fetch and store resources in a resource cache.
 */
export interface ResourceCache {
    readonly name: string;

    /**
     * Prune the cache. This will remove older versions from the cache.
     */
    prune: () => Promise<void>;

    /**
     * Populate the cache with all files required for the app to function while
     * being offline.
     */
    populate: () => Promise<void>;

    /**
     * Fetch a resource from the cache or fall back to fetch it from the
     * network. A response fetched from the network will be stored in the cache
     * for subsequent requests.
     *
     * @param event A fetch event.
     * @returns The corresponding response.
     * @throws In case no response could be fetched.
     */
    fetch: (event: FetchEvent) => Promise<Response>;
}
