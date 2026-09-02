import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
import type {u53} from '@threema/ts-utils/integer/u53';
import * as tweetnacl from 'tweetnacl';
import {describe, expect, it} from 'vitest';

import {type CryptoBoxBackend, NONCE_UNGUARDED_SCOPE} from '../backend.js';
import {CryptoError} from '../error.js';
import {type ReadonlyRawKey, wrapRawKey} from '../key.js';
import {
    type Ed25519PublicKey,
    type Ed25519Signature,
    ensureEd25519PublicKey,
    ensureEd25519Signature,
    NACL_CONSTANTS,
    type Nonce,
    type PublicKey,
    type RawEncryptedData,
    type RawPlainData,
} from '../primitives.js';
import {createTestCryptoPrng} from '../utils/test/create-test-crypto-prng.js';

import {TweetNaClBackend} from './index.js';

const prng = createTestCryptoPrng();

const crypto = new TweetNaClBackend(prng);

const MESSAGE = Uint8Array.from([0x74, 0x68, 0x72, 0x65, 0x65, 0x6d, 0x61]);
const SECRET_KEY = new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(0x11);
const SECRET_KEY_A = new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(0x44);
const SECRET_KEY_B = new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(0x55);
const KEY_PAIR_A = tweetnacl.box.keyPair.fromSecretKey(SECRET_KEY_A);
const KEY_PAIR_B = tweetnacl.box.keyPair.fromSecretKey(SECRET_KEY_B);
const SIGNING_KEY_PAIR = tweetnacl.sign.keyPair.fromSeed(
    new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(0x33),
);

/** A fresh nonce. Note: The backend expects a mutable nonce, so never share one between tests. */
function nonce(fill: u53 = 0x22): Nonce {
    return new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(fill) as Nonce;
}

/** Wrap a copy of `key`, so that the wrapped key cannot be modified through the original. */
function rawKey(key: ReadonlyUint8Array): ReadonlyRawKey<32> {
    return wrapRawKey(Uint8Array.from(key), NACL_CONSTANTS.KEY_LENGTH).asReadonly();
}

/**
 * A key of an invalid length, which {@link wrapRawKey} refuses to create.
 */
function invalidRawKey(): ReadonlyRawKey<32> {
    const key = new Uint8Array(NACL_CONSTANTS.KEY_LENGTH - 1);
    return {unwrap: () => key} as unknown as ReadonlyRawKey<32>;
}

/** The raw box backend of a secret-key box, i.e. the `TweetNaClBoxBackend`. */
function secretBoxBackend(key: ReadonlyUint8Array = SECRET_KEY): CryptoBoxBackend {
    return crypto.getSecretBox(rawKey(key), NONCE_UNGUARDED_SCOPE, undefined).raw;
}

/** The raw box backend of a shared-key box, i.e. the `TweetNaClBoxBackend`. */
function sharedBoxBackend(
    publicKey: ReadonlyUint8Array,
    secretKey: ReadonlyUint8Array,
): CryptoBoxBackend {
    return crypto.getSharedBox(
        publicKey as PublicKey,
        rawKey(secretKey),
        NONCE_UNGUARDED_SCOPE,
        undefined,
    ).raw;
}

/** A plain data buffer with the backend's plain headroom upfront, followed by `message`. */
function plainData(message: ReadonlyUint8Array): RawPlainData {
    const plain = new Uint8Array(crypto.plainHeadroom + message.byteLength);
    plain.set(message as Uint8Array, crypto.plainHeadroom);
    return plain as RawPlainData;
}

/**
 * An encrypted data buffer with the backend's encrypted headroom upfront, followed by the
 * `ciphertext` (i.e. the MAC and the encrypted message) as returned by TweetNaCl's high-level API.
 */
function encryptedData(ciphertext: ReadonlyUint8Array): RawEncryptedData {
    const encrypted = new Uint8Array(crypto.encryptedHeadroom + ciphertext.byteLength);
    encrypted.set(ciphertext as Uint8Array, crypto.encryptedHeadroom);
    return encrypted as RawEncryptedData;
}

/** Assert that `actual` is 0-padded up to `length` and continues with `expected`. */
function expectPadded(actual: ReadonlyUint8Array, length: u53, expected: ReadonlyUint8Array): void {
    expect(byteEquals(actual.subarray(0, length), new Uint8Array(length))).toBe(true);
    expect(byteEquals(actual.subarray(length), expected)).toBe(true);
}

describe('TweetNaClBackend', () => {
    it('reports the headrooms of the NaCl secretbox data layout', () => {
        // Assert
        expect(crypto.plainHeadroom).toBe(NACL_CONSTANTS.KEY_LENGTH);
        expect(crypto.encryptedHeadroom).toBe(NACL_CONSTANTS.MAC_LENGTH);
    });

    it('exposes the CSPRNG it was created with', () => {
        // Arrange
        //
        // Note: A dedicated PRNG, so that the expected bytes do not depend on how much the other
        // tests in this file have already drawn from the shared one.
        const backend = new TweetNaClBackend(createTestCryptoPrng());
        const buffer = new Uint8Array(4);

        // Act
        const filled = backend.randomBytes(buffer);

        // Assert
        expect(filled).toBe(buffer);
        expect(byteEquals(buffer, Uint8Array.of(0x3b, 0x76, 0xb1, 0xec))).toBe(true);
    });

    describe('#derivePublicKey', () => {
        it('derives the public key of a secret key', () => {
            // Act
            const publicKey = crypto.derivePublicKey(rawKey(SECRET_KEY_A));

            // Assert
            expect(byteEquals(publicKey, KEY_PAIR_A.publicKey)).toBe(true);
        });

        it('asserts the secret key length', () => {
            // Act & assert
            expect(() => crypto.derivePublicKey(invalidRawKey())).toThrow(Error);
        });
    });

    describe('#verifyEd25519Signature', () => {
        const publicKey = ensureEd25519PublicKey(SIGNING_KEY_PAIR.publicKey);
        const signature = ensureEd25519Signature(
            tweetnacl.sign.detached(MESSAGE, SIGNING_KEY_PAIR.secretKey),
        );

        it('accepts a valid signature', () => {
            // Act & assert
            crypto.verifyEd25519Signature(publicKey, MESSAGE, signature);
        });

        it('rejects a signature of another message', () => {
            // Act & assert
            expect(() =>
                crypto.verifyEd25519Signature(publicKey, Uint8Array.from([0x00]), signature),
            ).toThrow(CryptoError);
        });

        it('rejects a signature made with another key', () => {
            // Arrange
            const otherKeyPair = tweetnacl.sign.keyPair.fromSeed(
                new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(0x66),
            );

            // Act & assert
            expect(() =>
                crypto.verifyEd25519Signature(
                    ensureEd25519PublicKey(otherKeyPair.publicKey),
                    MESSAGE,
                    signature,
                ),
            ).toThrow(CryptoError);
        });

        it('validates the public key length', () => {
            // Act & assert
            expect(() =>
                crypto.verifyEd25519Signature(
                    SIGNING_KEY_PAIR.publicKey.subarray(
                        1,
                    ) as ReadonlyUint8Array as Ed25519PublicKey,
                    MESSAGE,
                    signature,
                ),
            ).toThrow(CryptoError);
        });

        it('validates the signature length', () => {
            // Act & assert
            expect(() =>
                crypto.verifyEd25519Signature(
                    publicKey,
                    MESSAGE,
                    signature.subarray(1) as Ed25519Signature,
                ),
            ).toThrow(CryptoError);
        });
    });

    describe('#getSharedKey', () => {
        it('derives the shared key of a public and a secret key', () => {
            // Act
            const sharedKey = crypto.getSharedKey(
                KEY_PAIR_B.publicKey as ReadonlyUint8Array as PublicKey,
                rawKey(SECRET_KEY_A),
            );

            // Assert
            expect(sharedKey.length).toBe(NACL_CONSTANTS.KEY_LENGTH);
            expect(
                byteEquals(
                    sharedKey.unwrap(),
                    tweetnacl.box.before(KEY_PAIR_B.publicKey, SECRET_KEY_A),
                ),
            ).toBe(true);
        });

        it('asserts the public and secret key lengths', () => {
            // Act & assert
            expect(() =>
                crypto.getSharedKey(
                    new Uint8Array(
                        NACL_CONSTANTS.KEY_LENGTH - 1,
                    ) as ReadonlyUint8Array as PublicKey,
                    rawKey(SECRET_KEY_A),
                ),
            ).toThrow(Error);
            expect(() =>
                crypto.getSharedKey(
                    KEY_PAIR_B.publicKey as ReadonlyUint8Array as PublicKey,
                    invalidRawKey(),
                ),
            ).toThrow(Error);
        });
    });

    describe('#getSecretBox', () => {
        it('asserts the secret key length', () => {
            // Act & assert
            expect(() =>
                crypto.getSecretBox(invalidRawKey(), NONCE_UNGUARDED_SCOPE, undefined),
            ).toThrow(Error);
        });
    });
});

describe('TweetNaClBoxBackend', () => {
    describe('#encrypt', () => {
        it('encrypts as the TweetNaCl secretbox does', () => {
            // Arrange
            const plain = plainData(MESSAGE);
            const encrypted = new Uint8Array(plain.byteLength) as RawEncryptedData;

            // Act
            secretBoxBackend().encrypt(encrypted, plain, nonce());

            // Assert
            expectPadded(
                encrypted,
                crypto.encryptedHeadroom,
                tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY),
            );
        });

        it('encrypts as the TweetNaCl box does', () => {
            // Arrange
            const plain = plainData(MESSAGE);
            const encrypted = new Uint8Array(plain.byteLength) as RawEncryptedData;

            // Act
            sharedBoxBackend(KEY_PAIR_B.publicKey, SECRET_KEY_A).encrypt(encrypted, plain, nonce());

            // Assert
            expectPadded(
                encrypted,
                crypto.encryptedHeadroom,
                tweetnacl.box(MESSAGE, nonce(), KEY_PAIR_B.publicKey, SECRET_KEY_A),
            );
        });

        it('encrypts in place when plain and encrypted data overlap', () => {
            // Arrange
            const buffer = plainData(MESSAGE);

            // Act
            secretBoxBackend().encrypt(buffer as unknown as RawEncryptedData, buffer, nonce());

            // Assert
            expectPadded(
                buffer,
                crypto.encryptedHeadroom,
                tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY),
            );
        });

        it('0-pads the plain headroom', () => {
            // Arrange
            const plain = plainData(MESSAGE);
            plain.fill(0xff, 0, crypto.plainHeadroom);
            const encrypted = new Uint8Array(plain.byteLength) as RawEncryptedData;

            // Act
            secretBoxBackend().encrypt(encrypted, plain, nonce());

            // Assert
            expectPadded(
                encrypted,
                crypto.encryptedHeadroom,
                tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY),
            );
        });

        it('validates the nonce length', () => {
            // Arrange
            const backend = secretBoxBackend();
            const plain = plainData(MESSAGE);
            const encrypted = new Uint8Array(plain.byteLength) as RawEncryptedData;

            // Act & assert
            for (const length of [
                NACL_CONSTANTS.NONCE_LENGTH - 1,
                NACL_CONSTANTS.NONCE_LENGTH + 1,
            ]) {
                expect(() =>
                    backend.encrypt(encrypted, plain, new Uint8Array(length) as Nonce),
                ).toThrow(CryptoError);
            }
        });

        it('validates that the data lengths match', () => {
            // Arrange
            const backend = secretBoxBackend();
            const plain = plainData(MESSAGE);

            // Act & assert
            for (const length of [plain.byteLength - 1, plain.byteLength + 1]) {
                expect(() =>
                    backend.encrypt(new Uint8Array(length) as RawEncryptedData, plain, nonce()),
                ).toThrow(CryptoError);
            }
        });

        it('throws if TweetNaCl rejects the data', () => {
            // Note: TweetNaCl's low-level secretbox refuses data that is shorter than the plain
            // headroom, i.e. data that cannot hold the MAC.
            // Act & assert
            expect(() =>
                secretBoxBackend().encrypt(
                    new Uint8Array(1) as RawEncryptedData,
                    new Uint8Array(1) as RawPlainData,
                    nonce(),
                ),
            ).toThrow(CryptoError);
        });
    });

    describe('#decrypt', () => {
        it('decrypts what the TweetNaCl secretbox encrypted', () => {
            // Arrange
            const encrypted = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));
            const plain = new Uint8Array(encrypted.byteLength) as RawPlainData;

            // Act
            secretBoxBackend().decrypt(plain, encrypted, nonce());

            // Assert
            expectPadded(plain, crypto.plainHeadroom, MESSAGE);
        });

        it('decrypts what the TweetNaCl box encrypted', () => {
            // Arrange
            const encrypted = encryptedData(
                tweetnacl.box(MESSAGE, nonce(), KEY_PAIR_B.publicKey, SECRET_KEY_A),
            );
            const plain = new Uint8Array(encrypted.byteLength) as RawPlainData;

            // Act
            sharedBoxBackend(KEY_PAIR_A.publicKey, SECRET_KEY_B).decrypt(plain, encrypted, nonce());

            // Assert
            expectPadded(plain, crypto.plainHeadroom, MESSAGE);
        });

        it('decrypts in place when plain and encrypted data overlap', () => {
            // Arrange
            const buffer = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));

            // Act
            secretBoxBackend().decrypt(buffer as unknown as RawPlainData, buffer, nonce());

            // Assert
            expectPadded(buffer, crypto.plainHeadroom, MESSAGE);
        });

        it('0-pads the encrypted headroom', () => {
            // Arrange
            const encrypted = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));
            encrypted.fill(0xff, 0, crypto.encryptedHeadroom);
            const plain = new Uint8Array(encrypted.byteLength) as RawPlainData;

            // Act
            secretBoxBackend().decrypt(plain, encrypted, nonce());

            // Assert
            expectPadded(plain, crypto.plainHeadroom, MESSAGE);
        });

        it('validates the nonce length', () => {
            // Arrange
            const backend = secretBoxBackend();
            const encrypted = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));
            const plain = new Uint8Array(encrypted.byteLength) as RawPlainData;

            // Act & assert
            for (const length of [
                NACL_CONSTANTS.NONCE_LENGTH - 1,
                NACL_CONSTANTS.NONCE_LENGTH + 1,
            ]) {
                expect(() =>
                    backend.decrypt(plain, encrypted, new Uint8Array(length) as Nonce),
                ).toThrow(CryptoError);
            }
        });

        it('validates that the data lengths match', () => {
            // Arrange
            const backend = secretBoxBackend();
            const encrypted = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));

            // Act & assert
            for (const length of [encrypted.byteLength - 1, encrypted.byteLength + 1]) {
                expect(() =>
                    backend.decrypt(new Uint8Array(length) as RawPlainData, encrypted, nonce()),
                ).toThrow(CryptoError);
            }
        });

        it('throws if TweetNaCl rejects the data', () => {
            // Act & assert
            expect(() =>
                secretBoxBackend().decrypt(
                    // Note: The two lengths match here, so this is not caught by the length check
                    // in the test above. TweetNaCl's low-level secretbox refuses data that is
                    // shorter than the plain headroom, i.e. data that cannot hold the MAC.
                    new Uint8Array(1) as RawPlainData,
                    new Uint8Array(1) as RawEncryptedData,
                    nonce(),
                ),
            ).toThrow(CryptoError);
        });

        it('throws if the data was encrypted with another nonce', () => {
            // Arrange
            const encrypted = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));
            const plain = new Uint8Array(encrypted.byteLength) as RawPlainData;

            // Act & assert
            expect(() => secretBoxBackend().decrypt(plain, encrypted, nonce(0x23))).toThrow(
                CryptoError,
            );
        });

        it('throws if the data was encrypted with another key', () => {
            // Arrange
            const encrypted = encryptedData(tweetnacl.secretbox(MESSAGE, nonce(), SECRET_KEY));
            const plain = new Uint8Array(encrypted.byteLength) as RawPlainData;

            // Act & assert
            expect(() => secretBoxBackend(SECRET_KEY_A).decrypt(plain, encrypted, nonce())).toThrow(
                CryptoError,
            );
        });
    });
});
