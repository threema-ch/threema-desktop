import type {CryptoBackend} from '~/common/crypto';
import type {u8, u32, u53, u64} from '~/common/types';
import {assert, unwrap} from '~/common/utils/assert';

/**
 * Cryptographically strong random number generator.
 *
 * @param buffer Buffer to fill with random values.
 * @returns The filled buffer for convenience.
 */
export type CryptoPrng = <T extends ArrayBufferView>(buffer: T) => T;

// Buffer and views for cryptographically secure random number generation
// IMPORTANT: These intentionally use the same buffer underneath!
const BUFFER = new ArrayBuffer(8);
const U8_BUFFER = new Uint8Array(BUFFER);
const U32_BUFFER = new Uint32Array(BUFFER);
const U64_BUFFER = new BigUint64Array(BUFFER);

/**
 * Calculate a random length for PKCS#7 padding.
 */
export function randomPkcs7PaddingLength(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
    constraints?: {readonly currentLength: u53; readonly minTotalLength: u8},
): u8 {
    let paddingLength = Math.max(randomU8(crypto), 1);
    if (constraints === undefined) {
        return paddingLength;
    }
    if (constraints.currentLength + paddingLength < constraints.minTotalLength) {
        paddingLength = constraints.minTotalLength - constraints.currentLength;
    }
    return paddingLength;
}

/**
 * Generate a cryptographically secure random unsigned 8-bit integer.
 */
export function randomU8(crypto: Pick<CryptoBackend, 'randomBytes'>): u8 {
    return unwrap(crypto.randomBytes(U8_BUFFER)[0]);
}

/**
 * Generate a cryptographically secure random unsigned 32-bit integer.
 */
export function randomU32(crypto: Pick<CryptoBackend, 'randomBytes'>): u32 {
    return unwrap(crypto.randomBytes(U32_BUFFER)[0]);
}

/**
 * Generate a cryptographically secure random unsigned 64-bit integer.
 */
export function randomU64(crypto: Pick<CryptoBackend, 'randomBytes'>): u64 {
    return unwrap(crypto.randomBytes(U64_BUFFER)[0]);
}

/**
 * Generate a random u32 with uniform distribution less than `upper` using
 * a CSPRNG.
 *
 * @param upper The upper bound.
 * @returns A random u32 less than `upper`.
 */
export function randomU32Uniform(crypto: Pick<CryptoBackend, 'randomBytes'>, upper: u32): u32 {
    // This is basically a port of `arc4random_uniform`. Quote:
    //
    // Uniformity is achieved by generating new random numbers until the one
    // returned is outside the range [0, 2**32 % upper_bound).  This
    // guarantees the selected random number will be inside
    // [2**32 % upper_bound, 2**32) which maps back to [0, upper_bound)
    // after reduction modulo upper_bound.
    assert(upper <= 2 ** 32 - 1, `Expected ${upper} to be < 2**32`);
    if (upper < 1) {
        return 0;
    }

    // Calculate the range of a u32 that would introduce bias for the
    // given `upper` value.
    //
    // Note: Since we're actually dealing with u53 here, we can use
    //       2**32 directly and not worry about wrapping.
    //       (I was tempted to say that this could be the **one** instance
    //       where JS numbers being disguised floats aren't a disadvantage but
    //       it actually limits us to u32 in the first place, so, meh!)
    const min = 2 ** 32 % upper;

    // Find a number that is not in the calculated bias range.
    //
    // Note: In the worst case, the probability of success of a loop
    //       iteration is p > 0.5.
    let result: u32;
    do {
        result = randomU32(crypto);
    } while (result < min);
    return result % upper;
}

/**
 * Return a random string with uniform distribution using a CSPRNG.
 *
 * The `length` must be at least 1.
 */
export function randomString(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
    length: u53,
    charset = 'abcdefghijklmnopqrstuvwxyz1234567890'.split(''),
): string {
    assert(length > 0, `Random string length must be at least 1, not ${length}`);
    return [...Array<undefined>(length)]
        .map(() => charset[randomU32Uniform(crypto, charset.length)])
        .join('');
}

/**
 * Choose a random item from the provided array.
 *
 * IMPORTANT: Expects that the amount of items in the array is
 *            > 0 and < than 2**32.
 */
export function randomChoice<T>(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
    array: readonly T[],
): T {
    assert(
        array.length > 0 && array.length < 2 ** 32,
        'Expected array to have more than 0 and less than 2 ** 32 items',
    );
    return unwrap(array[randomU32Uniform(crypto, array.length)]);
}
