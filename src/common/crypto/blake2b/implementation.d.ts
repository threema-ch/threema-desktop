/* eslint-disable @typescript-eslint/ban-types */
/**
 * TypeScript types for {@link https://raw.githubusercontent.com/emilbayes/blake2b/1f63e02/index.js}.
 */

import {type ReadonlyUint8Array, type u53} from '~/common/types';

declare class Blake2b {
    public update(input: ReadonlyUint8Array): this;
    public digest(out?: Uint8Array): Uint8Array;
}

/**
 * Create a new blake2b hash instance, optionally with the specified `key`, `salt` and `personal`.
 *
 * Once the instance is created, call the `update` method repeatedly to add more data to be hashed.
 * Finally, finalize the hash with `digest`.
 *
 * @param outlen Number of bytes of the output hash. Must be between {@link BYTES_MIN} and
 *   {@link BYTES_MAX}.
 * @param key They key to use for hashing.
 * @param salt The salt to use for hashing.
 * @param personal The personal to use for hashing.
 * @param noAssert Set to `true` to disable input assertions.
 */
export function createHash(
    outlen: u53,
    key: ReadonlyUint8Array | null,
    salt: ReadonlyUint8Array | null,
    personal: ReadonlyUint8Array | null,
    noAssert?: boolean,
): Blake2b;

export const BYTES_MIN: 16;
export const BYTES_MAX: 64;
export const BYTES: 32;
export const KEYBYTES_MIN: 16;
export const KEYBYTES_MAX: 64;
export const KEYBYTES: 32;
export const SALTBYTES: 16;
export const PERSONALBYTES: 16;
