import type {u53} from '../integer/u53.js';
import type {u64} from '../integer/u64.js';

/**
 * Convert a unix timestamp (in milliseconds) to a Date object.
 */
export function unixTimestampToDateMs(timestamp: u53 | u64): Date {
    timestamp = Number(timestamp);
    if (timestamp > 8640000000000000) {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    return new Date(timestamp);
}
