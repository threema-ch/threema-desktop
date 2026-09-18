/**
 * Properties to validate a URL with.
 */
export interface ValidateUrlProperties {
    readonly protocol: 'https:' | 'wss:';
    readonly search: 'allow' | 'deny';
    readonly hash: 'allow' | 'deny';
}

/**
 * Validate that the URL fulfills the expected properties.
 *
 * @param url Provided URL.
 * @param properties Expected properties to check for
 * @returns unmodified validated {@link URL}.
 */
export function validateUrl(source: string | URL, properties: ValidateUrlProperties): URL {
    const url = typeof source === 'string' ? new URL(source) : source;

    // Validate
    if (url.protocol !== properties.protocol) {
        throw new Error(
            `URL uses unexpected protocol: '${url}' (expected-protocol=${properties.protocol})`,
        );
    }
    if (properties.search === 'deny' && url.search !== '') {
        throw new Error(`URL may not contain search parameters: '${url}'`);
    }
    if (properties.hash === 'deny' && url.hash !== '') {
        throw new Error(`URL may not contain fragment/hash: '${url}'`);
    }

    return url;
}
