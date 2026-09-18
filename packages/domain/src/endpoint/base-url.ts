import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {validateUrl, type ValidateUrlProperties} from './validate-url.js';

/**
 * A base URL (has a trailing slash).
 */
export type BaseUrl = WeakOpaque<URL, {readonly BaseUrl: unique symbol}>;

/**
 * Ensure the resulting URL is a base URL and uses the expected protocol. A base URL has the
 * following properties:
 *
 * - Path ends with a forward slash (auto-fixed if missing).
 * - No search parameters (throws {@link Error} if provided).
 * - No fragment/hash (throws {@link Error} if provided).
 * - May have username, password or port.
 *
 * @param url Provided URL.
 * @param protocol Expected protocol.
 * @returns validated {@link BaseUrl}.
 */
export function ensureBaseUrl(
    source: string | URL,
    protocol: NonNullable<ValidateUrlProperties['protocol']>,
): BaseUrl {
    // Make a copy of the URL and validate protocol, search and hash.
    const url = validateUrl(new URL(source.toString()), {protocol, search: 'deny', hash: 'deny'});

    // Ensure path ends with '/'.
    if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
    }

    return url as BaseUrl;
}
