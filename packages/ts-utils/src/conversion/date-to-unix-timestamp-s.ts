import type {u32} from '../integer/u32.js';

/**
 * Convert a Date object into a unix timestamp (in seconds).
 */
export function dateToUnixTimestampS(date: Date): u32 {
    // eslint-disable-next-line no-bitwise
    return (Number(date) / 1000) | 0;
}
