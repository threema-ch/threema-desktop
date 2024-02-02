const BYTE_UNITS = ['Byte', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/**
 * Convert an byte amount to human readable Byte, KiB, MiB, GiB or TiB.
 *
 * @param size number of bytes to convert into human readable string
 * @returns human readable size as a string.
 */
export function byteSizeToHumanReadable(size: number): string {
    let exponent = 0;
    if (size > 0) {
        exponent = Math.floor(Math.log(size) / Math.log(1024));
    }
    const base = (size / 1024 ** exponent).toFixed(2);
    const unit = BYTE_UNITS[exponent] ?? '???';
    return `${base} ${unit}`;
}

/**
 * Convert an amount of seconds to human readable time format.
 *
 * @param seconds Amount of seconds to convert.
 * @returns human readable time format in the form of `H:MM:SS`.
 */
export function secondsToHumanReadable(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const str = {
        hours: hours > 0 ? `${hours}:` : undefined,
        minutes: `${Math.floor((seconds % 3600) / 60)}`.padStart(2, '0'),
        seconds: `${Math.floor(seconds % 60)}`.padStart(2, '0'),
    };
    return `${str.hours ?? ''}${str.minutes}:${str.seconds}`;
}
