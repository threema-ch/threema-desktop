import * as tweetnacl from 'tweetnacl';

import {
    type Cookie,
    type CryptoBackend,
    type CryptoBoxBackend,
    NACL_CONSTANTS,
    type Nonce,
    type NonceUnguardedScope,
    type PublicKey,
    type RawEncryptedData,
    type RawKey,
    type RawPlainData,
    type ReadonlyRawKey,
    wrapRawKey,
    type Ed25519PublicKey,
    type Ed25519Signature,
} from '~/common/crypto';
import {CryptoBox} from '~/common/crypto/box';
import type {INonceService} from '~/common/crypto/nonce';
import type {CryptoPrng} from '~/common/crypto/random';
import type {NonceScope} from '~/common/enum';
import {CryptoError} from '~/common/error';
import type {i53, ReadonlyUint8Array, u8, u53, u64, WeakOpaque} from '~/common/types';
import {assert} from '~/common/utils/assert';

/**
 * A secret key.
 *
 * IMPORTANT: Scoped to this implementation only. Do not export!
 */
type SecretKey = WeakOpaque<ReadonlyUint8Array, {readonly SecretKey: unique symbol}>;

/**
 * A shared key generated from the secret key of A and the public key of B.
 *
 * IMPORTANT: Scoped to this implementation only. Do not export!
 */
type SharedKey = WeakOpaque<ReadonlyUint8Array, {readonly SharedKey: unique symbol}>;

/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Low level functionality of TweetNaCl.js.
 */
interface TweetNaClLowLevel {
    readonly crypto_secretbox_KEYBYTES: u8;
    readonly crypto_secretbox_NONCEBYTES: u8;
    readonly crypto_secretbox_ZEROBYTES: u8;
    readonly crypto_secretbox_BOXZEROBYTES: u8;
    readonly crypto_box_PUBLICKEYBYTES: u8;
    readonly crypto_box_SECRETKEYBYTES: u8;
    readonly crypto_box_BEFORENMBYTES: u8;

    crypto_scalarmult_base: (q: PublicKey, n: ReadonlyUint8Array) => void;

    crypto_box_beforenm: (sharedKey: SharedKey, publicKey: PublicKey, secretKey: SecretKey) => void;

    crypto_secretbox: (
        encrypted: RawEncryptedData,
        plain: RawPlainData,
        length: u53,
        nonce: Nonce,
        key: SecretKey,
    ) => i53;

    crypto_secretbox_open: (
        plain: RawPlainData,
        encrypted: RawEncryptedData,
        length: u53,
        nonce: Nonce,
        key: SecretKey,
    ) => i53;
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Interface extensions for TweetNaCl.js type defintions which are missing
 * low-level functions.
 */
interface TweetNaCl extends tweetnacl {
    readonly lowlevel: TweetNaClLowLevel;
}

// Low-level interface accessor
const nacl = (tweetnacl as TweetNaCl).lowlevel;

// Constants
const PLAIN_HEADROOM = nacl.crypto_secretbox_ZEROBYTES;
const ENCRYPTED_HEADROOM = nacl.crypto_secretbox_BOXZEROBYTES;

// Sanity-check
assert(nacl.crypto_box_BEFORENMBYTES === NACL_CONSTANTS.KEY_LENGTH);

/**
 * TweetNaCl.js box crypto implementation.
 */
class TweetNaClBoxBackend implements CryptoBoxBackend {
    readonly #_key: ReadonlyRawKey<32>;

    public constructor(key: ReadonlyRawKey<32>) {
        this.#_key = key;
    }

    public encrypt(encrypted: RawEncryptedData, plain: RawPlainData, nonce: Nonce): void {
        // Validate lengths
        if (nonce.byteLength !== NACL_CONSTANTS.NONCE_LENGTH) {
            throw new CryptoError(`box.encrypt with invalid nonce length ${nonce.byteLength}`);
        }
        if (encrypted.byteLength !== plain.byteLength) {
            throw new CryptoError(
                'box.encrypt with data length mismatch: ' +
                    `encrypted=${encrypted.byteLength}, plain=${plain.byteLength}`,
            );
        }

        // 0-pad plain data
        plain.fill(0x00, 0, PLAIN_HEADROOM);

        // Encrypt
        const code = nacl.crypto_secretbox(
            encrypted,
            plain,
            plain.byteLength,
            nonce,
            this.#_key.unwrap() as SecretKey,
        );
        if (code !== 0) {
            throw new CryptoError(
                `box.encrypt tweetnacl.lowlevel.crypto_secretbox returned ${code}`,
            );
        }
    }

    public decrypt(plain: RawPlainData, encrypted: RawEncryptedData, nonce: Nonce): void {
        // Validate lengths
        if (nonce.byteLength !== NACL_CONSTANTS.NONCE_LENGTH) {
            throw new CryptoError(`box.decrypt with invalid nonce length ${nonce.byteLength}`);
        }
        if (plain.byteLength !== encrypted.byteLength) {
            throw new CryptoError(
                'box.decrypt with data length mismatch: ' +
                    `plain=${plain.byteLength}, encrypted=${encrypted.byteLength}`,
            );
        }

        // 0-pad encrypted data
        encrypted.fill(0x00, 0, ENCRYPTED_HEADROOM);

        // Decrypt
        const code = nacl.crypto_secretbox_open(
            plain,
            encrypted,
            encrypted.byteLength,
            nonce,
            this.#_key.unwrap() as SecretKey,
        );
        if (code !== 0) {
            throw new CryptoError(
                `box.decrypt tweetnacl.lowlevel.crypto_secretbox_open returned ${code}`,
            );
        }
    }
}

/**
 * TweetNaCl.js crypto backend implementation.
 */
export class TweetNaClBackend implements CryptoBackend {
    public readonly plainHeadroom = PLAIN_HEADROOM;
    public readonly encryptedHeadroom = ENCRYPTED_HEADROOM;
    public readonly randomBytes: CryptoPrng;

    public constructor(csprng: CryptoPrng) {
        this.randomBytes = csprng;
    }

    /** @inheritdoc */
    public derivePublicKey(secretKey: ReadonlyRawKey<32>): PublicKey {
        // Sanity-check
        assert(secretKey.unwrap().byteLength === NACL_CONSTANTS.KEY_LENGTH);

        // Derive public key
        const publicKey = new Uint8Array(
            NACL_CONSTANTS.KEY_LENGTH,
        ) as ReadonlyUint8Array as PublicKey;
        nacl.crypto_scalarmult_base(publicKey, secretKey.unwrap());
        return publicKey;
    }

    /** @inheritdoc */
    public verifyEd25519Signature(
        publicKey: Ed25519PublicKey,
        message: ReadonlyUint8Array,
        signature: Ed25519Signature,
    ): void {
        // Validate lengths
        if (publicKey.byteLength !== NACL_CONSTANTS.KEY_LENGTH) {
            throw new CryptoError(`Ed25519 public key with invalid length ${publicKey.byteLength}`);
        }
        if (signature.byteLength !== NACL_CONSTANTS.SIGNATURE_LENGTH) {
            throw new CryptoError(`Ed25519 signature with invalid length ${signature.byteLength}`);
        }

        // Verify signature
        if (
            !tweetnacl.sign.detached.verify(
                message as Uint8Array,
                signature as ReadonlyUint8Array as Uint8Array,
                publicKey as ReadonlyUint8Array as Uint8Array,
            )
        ) {
            throw new CryptoError('Ed25519 signature does not match!');
        }
    }

    /** @inheritdoc */
    public getSecretBox<
        DCK extends Cookie,
        ECK extends Cookie,
        DSN extends u64,
        ESN extends u64,
        TNonceScope extends NonceScope | NonceUnguardedScope,
    >(
        secretKey: ReadonlyRawKey<32>,
        nonceScope: TNonceScope,
        nonceService: TNonceScope extends NonceUnguardedScope ? undefined : INonceService,
    ): CryptoBox<DCK, ECK, DSN, ESN, TNonceScope> {
        // Sanity-check
        assert(secretKey.unwrap().byteLength === NACL_CONSTANTS.KEY_LENGTH);

        // Create box instance
        return new CryptoBox(this, nonceService, new TweetNaClBoxBackend(secretKey), nonceScope);
    }

    /** @inheritdoc */
    public getSharedKey(publicKey: PublicKey, secretKey: ReadonlyRawKey<32>): RawKey<32> {
        // Sanity-check
        assert(publicKey.byteLength === NACL_CONSTANTS.KEY_LENGTH);
        assert(secretKey.unwrap().byteLength === NACL_CONSTANTS.KEY_LENGTH);

        // Calculate shared key
        const sharedKey = wrapRawKey(
            new Uint8Array(NACL_CONSTANTS.KEY_LENGTH),
            NACL_CONSTANTS.KEY_LENGTH,
        );
        nacl.crypto_box_beforenm(
            sharedKey.unwrap() as SharedKey,
            publicKey,
            secretKey.unwrap() as SecretKey,
        );
        return sharedKey;
    }

    /** @inheritdoc */
    public getSharedBox<
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
    ): CryptoBox<DCK, ECK, DSN, ESN, TNonceScope> {
        return new CryptoBox(
            this,
            nonceService,
            new TweetNaClBoxBackend(this.getSharedKey(publicKey, secretKey).asReadonly()),
            nonceScope,
        );
    }
}
