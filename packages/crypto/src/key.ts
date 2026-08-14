import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {blake2bHash, type Blake2bKeyLength, type Blake2bParameters} from './blake2b/blake2b.js';
import {CryptoError} from './error.js';

/**
 * Valid secret key lengths.
 */
export type SecretKeyLength = 32 | 64;

/**
 * A readonly raw key (bytes). May be of any valid {@link SecretKeyLength}.
 *
 * In contrast to a {@link RawKey}, this type does not expose the `purge` method.
 *
 * IMPORTANT: Read the rules of thumb explained by {@link SecretKey}.
 */
export type ReadonlyRawKey<TLength extends SecretKeyLength> = WeakOpaque<
    Omit<SecretKey<TLength>, 'purge'>,
    {readonly ReadonlyRawKey: unique symbol}
>;

/**
 * A raw key (bytes). May be of any valid {@link SecretKeyLength}.
 *
 * IMPORTANT: Read the rules of thumb explained by {@link SecretKey}.
 */
export type RawKey<TLength extends SecretKeyLength> = WeakOpaque<
    SecretKey<TLength>,
    {readonly RawKey: unique symbol}
>;

/**
 * Convert raw key (bytes). May be of any valid {@link SecretKeyLength}.
 *
 * @throws {CryptoError} in case the key does not satisfy the `length` constraint.
 */
export function wrapRawKey<TLength extends SecretKeyLength>(
    key: Uint8Array,
    length: TLength,
): RawKey<TLength> {
    return SecretKey.wrap<TLength>(key, length);
}

/** Extended Blake2b hash parameters for deriving keys. */
export interface Blake2bKdfParameters extends Blake2bParameters {
    /** Additional input to be applied to the Blake2b hash. */
    readonly input?: ReadonlyUint8Array;
}

/**
 * Derive a secret key from another key using the Blake2b hash function.
 *
 * @param length The derived key length
 * @param key They input key to use for hashing.
 * @param parameters Blake2b hash parameters to be applied.
 * @returns a derived NaCl {@link RawKey}.
 * @throws {Error} If `personal` or `salt` are too long to be used.
 * @throws {Utf8EncodingError} If `personal` or `salt` could not be UTF-8 encoded.
 */
export function deriveKey<TDerivedKeyLength extends Blake2bKeyLength>(
    length: TDerivedKeyLength,
    key: ReadonlyRawKey<Blake2bKeyLength>,
    parameters: Blake2bKdfParameters,
): RawKey<TDerivedKeyLength> {
    // Derive and immediately tag as a raw secure secret key
    const derived = blake2bHash(length, key.asReadonly(), parameters);
    if (parameters.input !== undefined) {
        derived.update(parameters.input);
    }
    return wrapRawKey(derived.digest(), length);
}

/**
 * Type guard for {@link ReadonlyRawKey}.
 */
export function isReadonlyRawKey<TLength extends SecretKeyLength>(
    raw: unknown,
    length: TLength,
): raw is ReadonlyRawKey<TLength> {
    return raw instanceof SecretKey && raw.length === length;
}

/**
 * An unwrapped raw key (bytes). Must be exactly 32 bytes long.
 *
 * IMPORTANT: UNSAFE! Only use this briefly! **DO NOT** hand out a reference of the key to
 *            another function that is not a foreign API or a worker!
 */
export type UnwrappedRawKey = WeakOpaque<Uint8Array, {readonly UnwrappedRawKey: unique symbol}>;

/**
 * A secret key.
 *
 * Rules of thumb:
 *
 * - All secret keys **must** be wrapped by this class.
 * - Our APIs **shall not** accept any other keys than {@link RawKey}, {@link ReadonlyRawKey} and
 *   derivates of that.
 * - The unwrapped key (via {@link unwrap}) **must not** be used longer than necessary in
 *   combination with foreign APIs.
 * - If the key is used for public-key cryptography, it **must** be consumed by a
 *   {@link SecureSharedBoxFactory}.
 * - If the key is used for secret-key cryptography indefinitely (i.e. used until closing the app),
 *   it **must** be cast to a {@link ReadonlyRawKey} via {@link asReadonly}.
 * - When the key is no longer needed, purge it via {@link purge}.
 *
 * Note: As a nice side effect, the class instance prevents you from being able to transfer a key to
 *       another thread.
 */
class SecretKey<TLength extends SecretKeyLength> {
    #_key: () => Uint8Array | undefined;

    private constructor(
        key: Uint8Array,
        public readonly length: TLength,
    ) {
        if (key.byteLength !== length) {
            throw new CryptoError(
                `Expected key to be ${length} bytes but has ${key.byteLength} bytes`,
            );
        }
        // Note: When the key is unwrapped and transferred, it will become empty bytes which means
        // it is effectively purged.
        this.#_key = () => (key.byteLength !== 0 ? key : undefined);
    }

    /** Wrap raw key (bytes). */
    public static wrap<TLength extends SecretKeyLength>(
        key: Uint8Array,
        length: TLength,
    ): RawKey<TLength> {
        return tag<RawKey<TLength>>(new SecretKey<TLength>(key, length));
    }

    /** Check if the key has been purged (or transferred). */
    public get purged(): boolean {
        return this.#_key() === undefined;
    }

    /** Cast a {@link RawKey} to a {@link ReadonlyRawKey}. */
    public asReadonly(): ReadonlyRawKey<TLength> {
        return tag<ReadonlyRawKey<TLength>>(this);
    }

    /**
     * Unwrap the raw key (bytes).
     *
     * IMPORTANT: UNSAFE! Only use this briefly! **DO NOT** hand out a reference of the key to
     * another function that is not a foreign API! **DO NOT** modify the key unless you absolutely
     * know what you're doing.
     */
    public unwrap(): UnwrappedRawKey {
        const key = this.#_key();

        // Check if key was purged
        if (key === undefined) {
            throw new Error('Cannot unwrap, key purged');
        }

        // Hand out
        return tag<UnwrappedRawKey>(key);
    }

    /** Purge the key from memory. */
    public purge(): void {
        const key = this.#_key();

        // Ignore if already purged
        if (key === undefined) {
            return;
        }

        // Purge the secret key (with a debug-friendly '#')
        // Loop to hopefully circumvent any optimisation attempts of the JS engine
        for (let offset = 0; offset < key.byteLength; ++offset) {
            key[offset] = 0x23;
        }
        this.#_key = () => undefined;
    }

    /**
     * Returns whether this key is identical to the other key.
     *
     * @param other The secret key to compare against
     * @returns true if the key bytes are equal, false otherwise
     * @throws {@link Error} if the other key was already purged
     */
    public equals(other: Pick<SecretKey<TLength>, 'unwrap'>): boolean {
        const key = this.#_key();
        if (key === undefined) {
            return false;
        }
        return byteEquals(key, other.unwrap());
    }
}
