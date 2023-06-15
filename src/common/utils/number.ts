import Long from 'long';

import {type ibig, type u32, type u53, type u64} from '~/common/types';

import {ensureError} from './assert';
import {bytesToHex, byteView, hexToBytes} from './byte';

/**
 * Convert a u64 to a Long instance.
 *
 * @param value Unsigned 64-bit integer to be converted.
 * @returns the value as a Long instance.
 */
export function intoUnsignedLong(value: u64): Long {
    return Long.fromBits(
        Number(BigInt.asUintN(32, value)),
        // eslint-disable-next-line no-bitwise
        Number(BigInt.asUintN(32, value >> 32n)),
        true,
    );
}

/**
 * Convert an unsigned Long instance to a u64.
 *
 * @throws {Error} if value is not unsigned
 */
export function intoU64(value: Long): u64 {
    if (!value.unsigned) {
        throw new Error(`Long value is not unsigned`);
    }
    return (
        BigInt(value.getLowBitsUnsigned()) +
        // eslint-disable-next-line no-bitwise
        (BigInt(value.getHighBitsUnsigned()) << 32n)
    );
}

/**
 * Convert a u64 to a little endian hex string.
 *
 * @param value Unsigned 64-bit integer to be converted
 * @returns the value as little endian hex string (16 characters).
 */
export function u64ToHexLe(value: u64): string {
    const array = new Uint8Array(8);
    byteView(DataView, array).setBigUint64(0, value, true);
    return bytesToHex(array);
}

/**
 * Convert a hex-encoded little-endian string to a u64.
 *
 * @throws {Error} if value is not a valid hex string, or if it does not contain 8 bytes
 */
export function hexLeToU64(hexValue: string): u64 {
    let bytes;
    try {
        bytes = hexToBytes(hexValue);
    } catch (error) {
        throw new Error('hexLeToU64 failed', {cause: ensureError(error)});
    }
    if (bytes.byteLength !== 8) {
        throw new Error(
            `hexLeToU64 failed: Value does not contain 8 bytes, but ${bytes.byteLength}`,
        );
    }
    return byteView(DataView, bytes).getBigUint64(0, true);
}

/**
 * Convert an 8-byte Uint8Array to a u64.
 *
 * @throws {Error} if array does not contain 8 bytes
 */
export function bytesLeToU64(bytes: Uint8Array): u64 {
    if (bytes.byteLength !== 8) {
        throw new Error(
            `bytesLeToU64 failed: Value does not contain 8 bytes, but ${bytes.byteLength}`,
        );
    }
    return byteView(DataView, bytes).getBigUint64(0, true);
}

/**
 * Convert a u64 to an 8-byte Uint8Array.
 */
export function u64ToBytesLe(value: u64): Uint8Array {
    const array = new Uint8Array(8);
    byteView(DataView, array).setBigUint64(0, value, true);
    return array;
}

/**
 * Convert a unix timestamp (in seconds) to a Date object.
 */
export function unixTimestamptoDateS(timestamp: u32): Date {
    return new Date(timestamp * 1000);
}

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

/**
 * Convert a Date object into a unix timestamp (in milliseconds).
 */
export function dateToUnixTimestampMs(date: Date): u64 {
    return BigInt(date.getTime());
}

/**
 * Convert a Date object into a unix timestamp (in seconds).
 */
export function dateToUnixTimestampS(date: Date): u32 {
    // eslint-disable-next-line no-bitwise
    return (Number(date) / 1000) | 0;
}

/**
 * A sort function that sorts bigints in ascending order.
 */
export function bigintSortAsc(a: ibig, b: ibig): u53 {
    if (a < b) {
        return -1;
    }
    if (a === b) {
        return 0;
    }
    return 1;
}

/**
 * A sort function that sorts bigints in descending order.
 */
export function bigintSortDesc(a: ibig, b: ibig): u53 {
    return -bigintSortAsc(a, b);
}

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
