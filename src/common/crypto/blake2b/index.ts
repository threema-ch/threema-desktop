import {type RawKey, type ReadonlyRawKey, type SecretKeyLength, wrapRawKey} from '~/common/crypto';
import {
    type Blake2b,
    createHash,
    PERSONALBYTES,
    SALTBYTES,
} from '~/common/crypto/blake2b/implementation';
import type {ReadonlyUint8Array, u53} from '~/common/types';
import {UTF8} from '~/common/utils/codec';

/**
 * A subset of valid Blake2b hash lengths relevant for our use cases.
 */
type Blake2bHashLength = 32 | 64;

/**
 * A subset of valid Blake2b key lengths relevant for our use cases.
 *
 * Note: This **must** be a subset of {@link SecretKeyLength}.
 */
export type Blake2bKeyLength = SecretKeyLength & (32 | 64);

/** Blake2b hash parameters */
export interface Blake2bParameters {
    /**
     * The 'personal' to use for hashing, usually for namespacing. Limited to 8 bytes for
     * compatibility with the high-level libsodium API.
     */
    readonly personal: Uint8Array | string;

    /**
     * The 'salt' to use for hashing, usually for deriving different. Limited to 8 bytes for
     * compatibility with the high-level libsodium API.
     */
    readonly salt: Uint8Array | string;
}

function encodeAndZeroPad(
    parameter: string | ReadonlyUint8Array | undefined,
    length: u53,
): ReadonlyUint8Array | undefined {
    if (typeof parameter === 'string') {
        return UTF8.encodeFullyInto(parameter, new Uint8Array(length)).array;
    }
    return parameter;
}

/**
 * Create a {@link Blake2b} hasher with the specified output `length`.
 *
 * The `key` and `parameters` are optional.
 */
export function hash(
    length: Blake2bHashLength,
    key: ReadonlyRawKey<Blake2bKeyLength> | undefined,
    parameters: Blake2bParameters | undefined,
): Blake2b {
    // UTF-8 encode and zeropad 'personal' and 'salt', if necessary.
    const encoded = {
        personal: encodeAndZeroPad(parameters?.personal, PERSONALBYTES),
        salt: encodeAndZeroPad(parameters?.salt, SALTBYTES),
    } as const;

    // Ensure that 'personal' and 'salt' only use the first 8 bytes (i.e. the remaining bytes must
    // be zero-padding).
    if (encoded.personal?.subarray(8).some((byte) => byte !== 0) ?? false) {
        throw new Error("Blake2b 'personal' too long");
    }
    if (encoded.salt?.subarray(8).some((byte) => byte !== 0) ?? false) {
        throw new Error("Blake2b 'salt' too long");
    }

    // Create hash
    return createHash(
        length,
        key?.unwrap() ?? null,
        encoded.salt ?? null,
        encoded.personal ?? null,
    );
}

/**
 * Derive a secret key from another key using the Blake2b hash function.
 *
 * @param length The derived key length
 * @param key They input key to use for hashing.
 * @param parameters Blake2b hash parameters to be applied.
 * @returns a derived NaCl {@link RawKey}.
 * @throws {Error} If `personal` or `salt` are too long to be used.
 * @throws {EncodingError} If `personal` or `salt` could not be UTF-8 encoded.
 */
export function deriveKey<TDerivedKeyLength extends Blake2bKeyLength>(
    length: TDerivedKeyLength,
    key: RawKey<Blake2bKeyLength>,
    parameters: Blake2bParameters,
): RawKey<TDerivedKeyLength> {
    // Derive and immediately tag as a raw secure secret key
    const derived = hash(length, key.asReadonly(), parameters).digest();
    return wrapRawKey(derived, length);
}
