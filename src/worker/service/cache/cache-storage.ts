import {type Config} from '~/common/config';
import {TransferTag} from '~/common/enum';
import {BaseError} from '~/common/error';
import {type Logger} from '~/common/logging';
import {unreachable} from '~/common/utils/assert';
import {registerErrorTransferHandler, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {type ServiceWorkerConfig} from '~/worker/service/config';

import {type CacheStrategy, type FetchResult, type FetchStrategy, type ResourceCache} from '.';

const CACHE_STORAGE_RESOURCE_CACHE_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    CacheStorageResourceCacheError,
    TransferTag.CACHE_STORAGE_RESOURCE_CACHE_ERROR
>({
    tag: TransferTag.CACHE_STORAGE_RESOURCE_CACHE_ERROR,
    serialize: () => [],
    deserialize: (message, cause) => new CacheStorageResourceCacheError(message, {from: cause}),
});

export class CacheStorageResourceCacheError extends BaseError {
    public readonly [TRANSFER_MARKER] = CACHE_STORAGE_RESOURCE_CACHE_ERROR_TRANSFER_HANDLER;
}

/**
 * The reason why a specific caching strategy was chosen.
 *
 * - none: The default caching strategy can be used
 * - by-request-api: Override based on the `cache` request property
 * - by-request-header: Override based on the cache control request header
 * - by-response-header: Override based on the cache control response header
 * - by-host-exclusion: Override based on the hostname
 */
type StrategyOverride =
    | 'none'
    | 'by-request-api'
    | 'by-request-header'
    | 'by-response-header'
    | 'by-host-exclusion';

/**
 * Uses the [CacheStorage API]{@link https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage}
 * to fetch and store resources.
 */
export class CacheStorageResourceCache implements ResourceCache {
    public readonly name = 'CacheStorageResourceCache';
    private readonly _log: Logger;
    private readonly _config: ServiceWorkerConfig;
    private readonly _hosts: {
        networkOnly: ReadonlySet<string>;
    };

    public constructor(log: Logger, commonConfig: Config, serverWorkerConfig: ServiceWorkerConfig) {
        this._log = log;
        this._config = serverWorkerConfig;
        const hosts = {
            networkOnly: new Set([
                // Don't cache responses of the directory server
                new URL(commonConfig.DIRECTORY_SERVER_URL).host,
            ]),
        };
        // We only want to cache our sources for 'web' in production mode
        // Note: Everything else will still be cached unless excluded
        if (import.meta.env.BUILD_TARGET !== 'web' || import.meta.env.DEBUG) {
            hosts.networkOnly.add(self.location.host);
        }
        this._hosts = hosts;
    }

    public async prune(): Promise<void> {
        const keys = await caches.keys();
        await Promise.all(
            keys.map(async (key: string) => {
                // Delete all caches from other versions
                if (key !== import.meta.env.BUILD_HASH) {
                    await self.caches.delete(key);
                    this._log.debug(`${key} deleted from cache`);
                }
            }),
        );
    }

    public async populate(): Promise<void> {
        // Populate the cache
        const cache = await self.caches.open(import.meta.env.BUILD_HASH);
        this._log.debug('Populating cache with', this._config.PRELOAD_ASSETS);
        await cache.addAll(Array.from(this._config.PRELOAD_ASSETS.values()));
    }

    public async fetch(event: FetchEvent): Promise<Response> {
        // Determine which strategy to use for fetching, including whether to cache
        const url = new URL(event.request.url);
        const strategy = this._getStrategy(event.request.cache, event.request.headers, url);

        // Fetch response using determined strategy
        let result: FetchResult;
        try {
            switch (strategy.fetch) {
                case 'network-only':
                    result = await this._fetchFromNetwork(event, url);
                    break;
                case 'network-then-cache':
                    result = await this._fetchFromNetworkFallbackToCache(event, url);
                    break;
                case 'cache-then-network':
                    result = await this._fetchFromCacheFallbackToNetwork(event, url);
                    break;
                default:
                    unreachable(strategy.fetch);
            }
        } catch (error) {
            this._log.error(
                `Could not fetch: ${url.pathname} (url=${event.request.url}, strategy=${strategy.fetch}, cache=${strategy.cache})`,
            );
            throw new CacheStorageResourceCacheError(`Could not fetch: ${url.pathname}`, {
                from: error,
            });
        }

        // If the response indicates that we should not cache, override to discard.
        if (strategy.cache !== 'discard' && !this._shouldCache(result.response.headers)) {
            strategy.cache = 'discard';
            strategy.override = 'by-response-header';
        }

        // Add to the cache (if necessary)
        if (strategy.cache === 'store') {
            await this._update(event.request, result.response.clone());
        }

        // Log and return the response
        if (this._config.VERBOSE_REQUEST_LOGGING) {
            this._log.debug(
                `Fetch result ${result.response.status}: ${url.pathname} (url=${event.request.url},` +
                    ` strategy=${strategy.fetch}, source=${result.source}, cache=${strategy.cache}, override=${strategy.override})`,
            );
        }
        return result.response;
    }

    /**
     * Determine the fetch and (initial) cache strategy based on the request.
     *
     * @param cache The `cache` property of the request.
     * @param headers Headers of the request.
     * @param url URL of the request.
     * @returns A fetch strategy.
     */
    private _getStrategy(
        cache: RequestCache,
        headers: Headers,
        url: URL,
    ): {
        fetch: FetchStrategy;
        cache: CacheStrategy;
        override: StrategyOverride;
    } {
        // If the request indicates that no cache should be used, don't attempt to use it in the
        // first place. There are two ways to signal this in a request: The `cache` property, or
        // cache control headers.
        //
        // First, check the `cache` property
        switch (cache) {
            case 'no-cache': // Fallthrough
            case 'no-store': // Fallthrough
            case 'reload':
                return {
                    fetch: 'network-only',
                    cache: 'discard',
                    override: 'by-request-api',
                };
            default: // Carry on
        }

        // Next, check cache control headers
        if (!this._shouldCache(headers)) {
            return {
                fetch: 'network-only',
                cache: 'discard',
                override: 'by-request-header',
            };
        }

        // Match based on predetermined rules for specific hosts
        if (this._hosts.networkOnly.has(url.host)) {
            return {
                fetch: 'network-only',
                cache: 'discard',
                override: 'by-host-exclusion',
            };
        }

        // Default: Cache, then fall back to network
        return {
            fetch: 'cache-then-network',
            cache: 'store',
            override: 'none',
        };
    }

    /**
     * Determine whether the associated HTTP response of an HTTP request (or
     * response) should be cached, based on HTTP headers.
     *
     * Note: This is a very limited implementation for handling `Cache-Control`
     *       directives! It does not handle age constraints, etc.
     *
     * @param headers Headers of an HTTP request or response.
     * @returns Whether the associated HTTP response should be cached.
     */
    private _shouldCache(headers: Headers): boolean {
        // Determine directives
        const control = headers.get('Cache-Control');
        if (control === null) {
            return true;
        }
        const directives = control
            .split(',')
            .map((directive: string): string => directive.trim().toLowerCase());

        // Determine whether to cache
        for (const directive of directives) {
            switch (directive) {
                case 'no-cache': // Fallthrough
                case 'no-store':
                    return false;
                default:
                    continue;
            }
        }
        return true;
    }

    /**
     * Fetch the response from the network.
     *
     * @param event A fetch event.
     * @param url URL of the fetch request.
     * @returns The corresponding response.
     * @throws In case no response could be fetched.
     */
    private async _fetchFromNetwork(event: FetchEvent, url: URL): Promise<FetchResult> {
        // Fetch from network
        return {
            source: 'network',
            response: await self.fetch(event.request),
        };
    }

    /**
     * Fetch the response from the network first and fall back to the cache.
     *
     * @param event A fetch event.
     * @param url URL of the fetch request.
     * @returns The corresponding response.
     * @throws In case no response could be fetched.
     */
    private async _fetchFromNetworkFallbackToCache(
        event: FetchEvent,
        url: URL,
    ): Promise<FetchResult> {
        try {
            // Fetch from network first
            return {
                source: 'network',
                response: await self.fetch(event.request),
            };
        } catch (error) {
            // Fall back to fetch from the cache
            return {
                source: 'cache',
                response: await this._match(event.request),
            };
        }
    }

    /**
     * Fetch the response from the cache first and fall back to the network.
     * @param event A fetch event.
     * @param url URL of the fetch request.
     * @returns The corresponding response.
     * @throws In case no response could be fetched.
     */
    private async _fetchFromCacheFallbackToNetwork(
        event: FetchEvent,
        url: URL,
    ): Promise<FetchResult> {
        try {
            // Fetch from the cache first
            return {
                source: 'cache',
                response: await this._match(event.request),
            };
        } catch (error) {
            // Fall back to fetch from the network
            return {
                source: 'network',
                response: await self.fetch(event.request),
            };
        }
    }

    /**
     * Attempts to find a response to a specific request in the cache.
     *
     * @param request The request to be looked for (acting as key).
     * @returns The matching response.
     * @throws In case a response has not been found.
     */
    private async _match(request: Request): Promise<Response> {
        const cache = await self.caches.open(import.meta.env.BUILD_HASH);
        const response = await cache.match(request);
        if (response === undefined || response.status === 404) {
            throw new CacheStorageResourceCacheError('no match');
        }
        return response;
    }

    /**
     * Update the cache.
     *
     * @param request The request to be updated (acting as key).
     * @param response The response to be cached for the corresponding request.
     */
    private async _update(request: Request, response: Response): Promise<void> {
        const cache = await self.caches.open(import.meta.env.BUILD_HASH);
        await cache.put(request, response);
    }
}
