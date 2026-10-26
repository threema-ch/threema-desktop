import type {u53} from '../integer/u53.js';

const SI_BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'];

/**
 * Convert a byte amount to a human readable size. The decimal system (SI) is used, in line with the
 * guidelines of Android, iOS, macOS and Ubuntu.
 *
 * @param size number of bytes to convert into human readable string
 * @returns human readable size as a string
 */
export function byteSizeToHumanReadable(size: u53): string {
    let exponent = 0;
    const divisor = 1000;
    if (size > 0) {
        exponent = Math.floor(Math.log(size) / Math.log(divisor));
    }
    if (size < 1000) {
        return `${size} B`;
    }
    const base = (size / divisor ** exponent).toFixed(2);
    const unit = SI_BYTE_UNITS[exponent] ?? '???';
    return `${base} ${unit}`;
}
