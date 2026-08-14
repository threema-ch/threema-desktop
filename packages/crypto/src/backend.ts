import type {NonceScope} from '@threema/protocol/enum';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {u53} from '@threema/ts-utils/integer/u53';
import type {u64} from '@threema/ts-utils/integer/u64';

import type {CryptoBox} from './box.js';
import type {RawKey, ReadonlyRawKey} from './key.js';
import type {INonceService} from './nonce.js';
import type {
    Cookie,
    Ed25519PublicKey,
    Ed25519Signature,
    Nonce,
    PublicKey,
    RawEncryptedData,
    RawPlainData,
} from './primitives.js';

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
     *   {@link CryptoBackend.encryptedHeadroom} bytes of 0-padding upfront.
     * @param plain Plain data input which MUST have space for
     *   {@link CryptoBackend.plainHeadroom} bytes of 0-padding upfront.
     * @param nonce Nonce to be used.
     * @throws {@link CryptoError} if encryption fails.
     */
    readonly encrypt: (encrypted: RawEncryptedData, plain: RawPlainData, nonce: Nonce) => void;

    /**
     * Decrypt encrypted data.
     *
     * @param plain Plain data output. MUST be of the same size as `encrypted`.
     *   The decrypted data will contain {@link CryptoBackend.plainHeadroom} bytes of
     *   0-padding upfront.
     * @param encrypted Encrypted data input which MUST have space for
     *   {@link CryptoBackend.encryptedHeadroom} bytes of 0-padding upfront.
     * @param nonce Nonce to be used.
     * @throws {@link CryptoError} if decryption fails.
     */
    readonly decrypt: (plain: RawPlainData, encrypted: RawEncryptedData, nonce: Nonce) => void;
}

/**
 * Token that allows to use a crypto backend with no nonce guard.
 */
export const NONCE_UNGUARDED_SCOPE: unique symbol = Symbol('nonce-unguarded-scope');

/**
 * The type of {@link NONCE_UNGUARDED_SCOPE}.
 */
export type NonceUnguardedScope = typeof NONCE_UNGUARDED_SCOPE;

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
     * Verify an ED25519 signed message.
     *
     * @param publicKey The Ed25519 public key.
     * @param message The signed message.
     * @param signature The Ed25519 signature.
     * @throws {@link CryptoError} if signature is invalid.
     */
    readonly verifyEd25519Signature: (
        publicKey: Ed25519PublicKey,
        message: ReadonlyUint8Array,
        signature: Ed25519Signature,
    ) => void;

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
     * @param nonceScope Optional nonce scope to prevent nonce reuse.
     * @throws {CryptoError} if the secret key has an invalid length.
     */
    readonly getSecretBox: <
        DCK extends Cookie,
        ECK extends Cookie,
        DSN extends u64,
        ESN extends u64,
        TNonceScope extends NonceScope | NonceUnguardedScope,
    >(
        secretKey: ReadonlyRawKey<32>,
        nonceScope: TNonceScope,
        nonceService: TNonceScope extends NonceUnguardedScope ? undefined : INonceService,
    ) => CryptoBox<DCK, ECK, DSN, ESN, TNonceScope>;

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
     * @param nonceScope Optional nonce scope to prevent nonce reuse.
     */
    readonly getSharedBox: <
        DCK extends Cookie,
        ECK extends Cookie,
        DSN extends u64,
        ESN extends u64,
        TNonceScope extends NonceScope | NonceUnguardedScope,
    >(
        publicKey: PublicKey,
        secretKey: ReadonlyRawKey<32>,
        nonceScope: TNonceScope,
        nonceService: TNonceScope extends NonceUnguardedScope ? undefined : INonceService,
    ) => CryptoBox<DCK, ECK, DSN, ESN, TNonceScope>;
}
