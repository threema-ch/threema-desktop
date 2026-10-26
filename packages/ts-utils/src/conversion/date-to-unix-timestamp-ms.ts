import type {u64} from '../integer/u64.js';

/**
 * Convert a Date object into a unix timestamp (in milliseconds).
 */
export function dateToUnixTimestampMs(date: Date): u64 {
    return BigInt(date.getTime());
}
