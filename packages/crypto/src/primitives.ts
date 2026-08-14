import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

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

    /**
     * Ed25519 signature length in bytes.
     */
    SIGNATURE_LENGTH: 64,
} as const;

export type SignatureLength = 64;

/**
 * An NaCl public key. Must be exactly 32 bytes long.
 */
export type PublicKey = WeakOpaque<ReadonlyUint8Array, {readonly PublicKey: unique symbol}>;

/**
 * Type guard for {@link PublicKey}.
 */
export function isPublicKey<TKey extends PublicKey>(raw: unknown): raw is TKey {
    return raw instanceof Uint8Array && raw.byteLength === NACL_CONSTANTS.KEY_LENGTH;
}

/**
 * Ensure input is a valid {@link PublicKey}.
 *
 * @throws If the array is not a valid public key.
 */
export function ensurePublicKey<TKey extends PublicKey>(key: ReadonlyUint8Array): TKey {
    if (!isPublicKey(key)) {
        throw new Error(
            `Expected public key to be ${NACL_CONSTANTS.KEY_LENGTH} bytes but has ${key.byteLength} bytes`,
        );
    }
    return key as TKey;
}

/**
 * An NaCl nonce. Must be exactly 24 bytes long.
 */
export type Nonce = WeakOpaque<Uint8Array, {readonly Nonce: unique symbol}>;

export function isNonce(value: unknown): value is Nonce {
    return value instanceof Uint8Array && value.byteLength === NACL_CONSTANTS.NONCE_LENGTH;
}

export function ensureNonce(value: ReadonlyUint8Array): Nonce {
    if (!isNonce(value)) {
        throw new Error(`Array of length ${value.byteLength} is not a valid nonce`);
    }
    return value;
}

/**
 * HMAC-SHA256 hash of a {@link Nonce}.
 */
export type NonceHash = WeakOpaque<ReadonlyUint8Array, {readonly NonceHash: unique symbol}>;

export function isNonceHash(value: unknown): value is NonceHash {
    return value instanceof Uint8Array && value.byteLength === 32;
}

export function ensureNonceHash(value: ReadonlyUint8Array): NonceHash {
    if (!isNonceHash(value)) {
        throw new Error(`Array of length ${value.byteLength} is not a valid nonce hash`);
    }
    return value;
}

/**
 * An Ed25519 public key. Must be exactly 32 bytes long.
 */
export type Ed25519PublicKey = WeakOpaque<
    ReadonlyUint8Array,
    {readonly Ed25519PublicKey: unique symbol}
>;

/**
 * Type guard for {@link Ed25519PublicKey}.
 */
export function isEd25519PublicKey(raw: unknown): raw is Ed25519PublicKey {
    return raw instanceof Uint8Array && raw.byteLength === NACL_CONSTANTS.KEY_LENGTH;
}

/**
 * Ensure input is a valid {@link Ed25519PublicKey}.
 *
 * @throws If the array is not a valid public key.
 */
export function ensureEd25519PublicKey(key: ReadonlyUint8Array): Ed25519PublicKey {
    if (!isEd25519PublicKey(key)) {
        throw new Error(
            `Expected Ed25519 public key to be ${NACL_CONSTANTS.KEY_LENGTH} bytes but has ${key.byteLength} bytes`,
        );
    }
    return key;
}

/**
 * An Ed25519 signature. Must be exactly 64 bytes long.
 */
export type Ed25519Signature = WeakOpaque<
    ReadonlyUint8Array,
    {readonly Ed25519Signature: unique symbol}
>;

/**
 * Type guard for {@link Ed25519Signature}.
 */
export function isEd25519Signature(raw: unknown): raw is Ed25519Signature {
    return raw instanceof Uint8Array && raw.byteLength === NACL_CONSTANTS.SIGNATURE_LENGTH;
}

/**
 * Ensure input is a valid {@link Ed25519Signature}.
 *
 * @throws If the array is not a valid public key.
 */
export function ensureEd25519Signature(signature: ReadonlyUint8Array): Ed25519Signature {
    if (!isEd25519Signature(signature)) {
        throw new Error(
            `Expected Ed25519 signature to be ${NACL_CONSTANTS.SIGNATURE_LENGTH} bytes but has ${signature.byteLength} bytes`,
        );
    }
    return signature;
}

/**
 * Length of a {@link Cookie} in bytes.
 */
export const COOKIE_LENGTH = 16;

/**
 * The first 16 byte of an NaCl nonce as used in the chat server and other protocols.
 */
export type Cookie = WeakOpaque<Uint8Array, {readonly Cookie: unique symbol}>;

/**
 * Type guard for {@link Cookie}.
 */
export function isCookie<TCookie extends Cookie>(raw: unknown): raw is TCookie {
    return raw instanceof Uint8Array && raw.byteLength === COOKIE_LENGTH;
}

/**
 * Ensure input is a valid {@link Cookie}.
 *
 * @throws If the array is not a valid cookie.
 */
export function ensureCookie<TCookie extends Cookie>(cookie: Uint8Array): TCookie {
    if (!isCookie(cookie)) {
        throw new Error(
            `Expected cookie to be ${COOKIE_LENGTH} bytes but has ${cookie.byteLength} bytes`,
        );
    }
    return cookie as TCookie;
}

/**
 * Encrypted data with {@link CryptoBackend.encryptedHeadroom} upfront.
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
 * Plain data with {@link CryptoBackend.plainHeadroom} upfront.
 */
export type RawPlainData = WeakOpaque<Uint8Array, {readonly RawPlainData: unique symbol}>;

/**
 * Plain data view (without any headroom upfront).
 */
export type PlainData = WeakOpaque<Uint8Array, {readonly PlainData: unique symbol}>;
