import {type CryptoBox} from '~/common/crypto/box';
import {CryptoError} from '~/common/error';
import {type ReadonlyUint8Array, type u53, type u64, type WeakOpaque} from '~/common/types';
import {byteEquals} from '~/common/utils/byte';
export type {CryptoBox};

/**
 * NaCl constants.
 */
export const NACL_CONSTANTS = {
    /**
     * Secret and public key length in bytes.
     */
    KEY_LENGTH: 32,

    /**
     * Nonce length in bytes.
     */
    NONCE_LENGTH: 24,

    /**
     * Message authentication code length in bytes.
     */
    MAC_LENGTH: 16,
} as const;

/**
 * Valid secret key lengths.
 */
export type SecretKeyLength = 32 | 64;

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
    #_key?: Uint8Array;

    private constructor(key: Uint8Array, public readonly length: TLength) {
        if (key.byteLength !== length) {
            throw new CryptoError(
                `Expected key to be ${length} bytes but has ${key.byteLength} bytes`,
            );
        }
        this.#_key = key;
    }

    /**
     * Wrap raw key (bytes).
     */
    public static wrap<TLength extends SecretKeyLength>(
        key: Uint8Array,
        length: TLength,
    ): RawKey<TLength> {
        return new SecretKey<TLength>(key, length) as RawKey<TLength>;
    }

    /**
     * Cast a {@link RawKey} to a {@link ReadonlyRawKey}.
     */
    public asReadonly(): ReadonlyRawKey<TLength> {
        return this as ReadonlyRawKey<TLength>;
    }

    /**
     * Unwrap the raw key (bytes).
     *
     * IMPORTANT: UNSAFE! Only use this briefly! **DO NOT** hand out a reference of the key to
     *            another function that is not a foreign API!
     */
    public unwrap(): ReadonlyUint8Array {
        // Check if key was purged
        if (this.#_key === undefined) {
            throw new Error('Cannot unwrap, key purged');
        }

        // Hand out
        return this.#_key;
    }

    /**
     * Purge the key from memory.
     */
    public purge(): void {
        // Ignore if already purged
        if (this.#_key === undefined) {
            return;
        }

        // Purge the secret key (with a debug-friendly '#')
        // Loop to hopefully circumvent any optimisation attempts of the JS engine
        for (let offset = 0; offset < this.#_key.byteLength; ++offset) {
            this.#_key[offset] = 0x23;
        }
        this.#_key = undefined;
    }

    /**
     * Returns whether this key is identical to the other key.
     *
     * @param other The secret key to compare against
     * @returns true if the key bytes are equal, false otherwise
     * @throws {@link Error} if the other key was already purged
     */
    public equals(other: SecretKey<TLength>): boolean {
        if (this.#_key === undefined) {
            return false;
        }
        return byteEquals(this.#_key, other.unwrap());
    }
}

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
 * Type guard for {@link ReadonlyRawKey}.
 */
export function isReadonlyRawKey<TLength extends SecretKeyLength>(
    raw: unknown,
    length: TLength,
): raw is ReadonlyRawKey<TLength> {
    return raw instanceof SecretKey && raw.length === length;
}

/**
 * An NaCl public key. Must be exactly 32 bytes long.
 */
export type PublicKey = WeakOpaque<ReadonlyUint8Array, {readonly PublicKey: unique symbol}>;

/**
 * Type guard for {@link PublicKey}.
 */
export function isPublicKey(raw: unknown): raw is PublicKey {
    return raw instanceof Uint8Array && raw.byteLength === NACL_CONSTANTS.KEY_LENGTH;
}

/**
 * Ensure input is a valid {@link PublicKey}.
 *
 * @throws If the array is not a valid public key.
 */
export function ensurePublicKey(key: ReadonlyUint8Array): PublicKey {
    if (!isPublicKey(key)) {
        throw new Error(
            `Expected public key to be ${NACL_CONSTANTS.KEY_LENGTH} bytes but has ${key.byteLength} bytes`,
        );
    }
    return key;
}

/**
 * An NaCl nonce. Must be exactly 24 bytes long.
 */
export type Nonce = WeakOpaque<Uint8Array, {readonly Nonce: unique symbol}>;

/**
 * The first 16 byte of an NaCl nonce as used in the chat server protocol.
 */
export type Cookie = WeakOpaque<Uint8Array, {readonly Cookie: unique symbol}>;

/**
 * Encrypted data with {@link Backend.encryptedHeadroom} upfront.
 */
export type RawEncryptedData = WeakOpaque<Uint8Array, {readonly RawEncryptedData: unique symbol}>;

/**
 * Encrypted data view (without any headroom upfront).
 */
export type EncryptedData = WeakOpaque<Uint8Array, {readonly EncryptedData: unique symbol}>;

/**
 * Concatenation of the nonce, followed by the encrypted data view.
 * (Both without any headroom upfront.)
 */
export type EncryptedDataWithNonceAhead = WeakOpaque<
    Uint8Array,
    {readonly EncryptedDataWithNonceAhead: unique symbol}
>;

/**
 * Ensure array contains at least NONCE_LENGTH + MAC_LENGTH bytes.
 *
 * @throws If the array is not at least NONCE_LENGTH + MAC_LENGTH bytes long.
 */
export function ensureEncryptedDataWithNonceAhead(bytes: Uint8Array): EncryptedDataWithNonceAhead {
    const ciphertextLength = NACL_CONSTANTS.NONCE_LENGTH + NACL_CONSTANTS.MAC_LENGTH;
    if (bytes.byteLength < ciphertextLength) {
        throw new Error(
            `Expected encrypted data to be at least ${ciphertextLength} bytes but has ${bytes.byteLength} bytes`,
        );
    }
    return bytes as EncryptedDataWithNonceAhead;
}

/**
 * Plain data with {@link Backend.plainHeadroom} upfront.
 */
export type RawPlainData = WeakOpaque<Uint8Array, {readonly RawPlainData: unique symbol}>;

/**
 * Plain data view (without any headroom upfront).
 */
export type PlainData = WeakOpaque<Uint8Array, {readonly PlainData: unique symbol}>;

/**
 * A box backend is used to encrypt and decrypt data from a secret or
 * precomputed shared key.
 */
export interface CryptoBoxBackend {
    /**
     * Encrypt plain data.
     *
     * @param encrypted Encrypted data output. MUST be of the same size as
     *   `plain`. The encrypted data will contain
     *   {@link Backend.encryptedHeadroom} bytes of 0-padding upfront.
     * @param plain Plain data input which MUST have space for
     *   {@link Backend.plainHeadroom} bytes of 0-padding upfront.
     * @param nonce Nonce to be used.
     * @throws {@link CryptoError} if encryption fails.
     */
    readonly encrypt: (encrypted: RawEncryptedData, plain: RawPlainData, nonce: Nonce) => void;

    /**
     * Decrypt encrypted data.
     *
     * @param plain Plain data output. MUST be of the same size as `encrypted`.
     *   The decrypted data will contain {@link Backend.plainHeadroom} bytes of
     *   0-padding upfront.
     * @param encrypted Encrypted data input which MUST have space for
     *   {@link Backend.encryptedHeadroom} bytes of 0-padding upfront.
     * @param nonce Nonce to be used.
     * @throws {@link CryptoError} if decryption fails.
     */
    readonly decrypt: (plain: RawPlainData, encrypted: RawEncryptedData, nonce: Nonce) => void;
}

/**
 * Token that allows to use a crypto backend with no nonce guard.
 */
export const NONCE_UNGUARDED_TOKEN: unique symbol = Symbol('nonce-unguarded-token');

/**
 * The type of {@link NONCE_UNGUARDED_TOKEN}.
 */
export type NonceUnguarded = typeof NONCE_UNGUARDED_TOKEN;

/**
 * Nonce storage to prevent reuse by checking for uniqueness.
 */
export interface NonceGuard {
    /**
     * Ensure a given nonce is unique and mark it as used.
     *
     * @param nonce The nonce to check for uniqueness and then remember.
     * @throws {CryptoError} if nonce re-use was detected.
     */
    readonly use: (nonce: Nonce) => void;
}

/**
 * A crypto backend.
 */
export interface CryptoBackend {
    /**
     * Headroom in bytes for plain (non-encrypted) data. In other words, this is the amount of
     * additional headroom needed when encrypting plain data.
     */
    readonly plainHeadroom: u53;

    /**
     * Headroom in bytes for encrypted data. In other words, this is the amount of additional
     * headroom needed when decrypting encrypted data.
     */
    readonly encryptedHeadroom: u53;

    /**
     * Generate cryptographically strong random values.
     *
     * @param array Buffer to fill with random values.
     * @returns the filled buffer for convenience.
     */
    readonly randomBytes: <T extends ArrayBufferView>(buffer: T) => T;

    /**
     * Derive a public key from a secret key.
     *
     * @param secretKey The secret key to derive from.
     */
    readonly derivePublicKey: (secretKey: ReadonlyRawKey<32>) => PublicKey;

    /**
     * Get a crypto box for secret-key cryptography.
     *
     * Note: After calling this function, it often may be a good idea to purge the `secretKey`!
     *
     * @param secretKey The secret key.
     * @param nonceGuard Optional nonce guard to prevent nonce reuse.
     * @throws {CryptoError} if the secret key has an invalid length.
     */
    readonly getSecretBox: <
        DCK extends Cookie,
        ECK extends Cookie,
        DSN extends u64,
        ESN extends u64,
        NG extends NonceGuard | NonceUnguarded,
    >(
        secretKey: ReadonlyRawKey<32>,
        nonceGuard: NG,
    ) => CryptoBox<DCK, ECK, DSN, ESN, NG>;

    /**
     * Derive the shared key.
     *
     * @param publicKey The public key (i.e. of the other party).
     * @param secretKey The secret key (i.e. yours).
     */
    readonly getSharedKey: (publicKey: PublicKey, secretKey: ReadonlyRawKey<32>) => RawKey<32>;

    /**
     * Get a crypto box for shared-key cryptography.
     *
     * @param publicKey The public key (i.e. of the other party).
     * @param secretKey The secret key (i.e. yours).
     * @param nonceGuard Optional nonce guard to prevent nonce reuse.
     */
    readonly getSharedBox: <
        DCK extends Cookie,
        ECK extends Cookie,
        DSN extends u64,
        ESN extends u64,
        NG extends NonceGuard | NonceUnguarded,
    >(
        publicKey: PublicKey,
        secretKey: ReadonlyRawKey<32>,
        nonceGuard: NG,
    ) => CryptoBox<DCK, ECK, DSN, ESN, NG>;
}
