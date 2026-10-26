import type {u32} from '../integer/u32.js';

/**
 * Convert a unix timestamp (in seconds) to a Date object.
 */
export function unixTimestampToDateS(timestamp: u32): Date {
    return new Date(timestamp * 1000);
}
