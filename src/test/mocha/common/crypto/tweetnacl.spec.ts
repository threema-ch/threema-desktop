import * as chai from 'chai';

import {
    NACL_CONSTANTS,
    type Nonce,
    NONCE_UNGUARDED_SCOPE,
    type PublicKey,
    type RawEncryptedData,
    type RawPlainData,
    type ReadonlyRawKey,
    wrapRawKey,
    ensureEd25519Signature,
    type Ed25519PublicKey,
    type Ed25519Signature,
} from '~/common/crypto';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {CryptoError} from '~/common/error';
import type {ReadonlyUint8Array} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import chaiByteEqual from '~/test/common/plugins/byte-equal';
import getSharedBoxTestVectors from '~/test/mocha/common/data/box.random';
import getSecretBoxTestVectors from '~/test/mocha/common/data/secretbox.random';
import getEd25519SignatureTestVectors from '~/test/mocha/common/data/sign';
import {fakeRandomBytes} from '~/test/mocha/common/utils';

const {expect} = chai.use(chaiByteEqual);

function mockReadonlyRawKey(key: Uint8Array): ReadonlyRawKey<32> {
    const wrapped = {
        unwrap: () => key,
        asReadonly: () => wrapped,
    } as const;
    return wrapped as unknown as ReadonlyRawKey<32>;
}

/**
 * TweetNacl crypto tests.
 */
export function run(): void {
    describe('NaCl constants', function () {
        it('should fix secret key length to 32 bytes', function () {
            expect(NACL_CONSTANTS.KEY_LENGTH).to.equal(32);
        });

        it('should fix public key length to 32 bytes', function () {
            expect(NACL_CONSTANTS.KEY_LENGTH).to.equal(32);
        });

        it('should fix nonce length to 24 bytes', function () {
            expect(NACL_CONSTANTS.NONCE_LENGTH).to.equal(24);
        });

        it('should fix Ed25519 signature length to 64 bytes', function () {
            expect(NACL_CONSTANTS.SIGNATURE_LENGTH).to.equal(64);
        });
    });

    describe('Crypto backend', function () {
        describe('TweetNaClBackend', function () {
            const tweetnacl = new TweetNaClBackend(fakeRandomBytes);
            const invalidReadonlyRawKey = mockReadonlyRawKey(new Uint8Array(31));

            describe('#verifyEd25519Signature', function () {
                const vectors = getEd25519SignatureTestVectors();
                const [validPublicKey, validMessage, validSignature] = unwrap(vectors[0]);

                it('should pass with valid signature', () => {
                    tweetnacl.verifyEd25519Signature(validPublicKey, validMessage, validSignature);
                });

                it('should fail with invalid signature', () => {
                    expect(() =>
                        tweetnacl.verifyEd25519Signature(
                            validPublicKey,
                            validMessage,
                            ensureEd25519Signature(tweetnacl.randomBytes(new Uint8Array(64))),
                        ),
                    ).to.throw(CryptoError);
                });

                it('should validate public key and signature length', () => {
                    expect(() =>
                        tweetnacl.verifyEd25519Signature(
                            new Uint8Array(31) as ReadonlyUint8Array as Ed25519PublicKey,
                            validMessage,
                            validSignature,
                        ),
                    ).to.throw(CryptoError);
                    expect(() =>
                        tweetnacl.verifyEd25519Signature(
                            validPublicKey,
                            validMessage,
                            new Uint8Array(63) as ReadonlyUint8Array as Ed25519Signature,
                        ),
                    ).to.throw(CryptoError);
                });

                it('should pass test vectors', function () {
                    for (const [publicKey, message, signature] of vectors) {
                        tweetnacl.verifyEd25519Signature(publicKey, message, signature);
                    }
                });
            });

            describe('#getSecretBox()', function () {
                it('should assert secret key length', () => {
                    expect(() =>
                        tweetnacl.getSecretBox(
                            invalidReadonlyRawKey,
                            NONCE_UNGUARDED_SCOPE,
                            undefined,
                        ),
                    ).to.throw(Error);
                });
            });

            describe('#getSharedBox()', function () {
                it('should assert shared key length', () => {
                    expect(() =>
                        tweetnacl.getSharedBox(
                            new Uint8Array(11) as ReadonlyUint8Array as PublicKey,
                            invalidReadonlyRawKey,
                            NONCE_UNGUARDED_SCOPE,
                            undefined,
                        ),
                    ).to.throw(Error);
                    expect(() =>
                        tweetnacl.getSharedBox(
                            new Uint8Array(32) as ReadonlyUint8Array as PublicKey,
                            invalidReadonlyRawKey,
                            NONCE_UNGUARDED_SCOPE,
                            undefined,
                        ),
                    ).to.throw(Error);
                    expect(() =>
                        tweetnacl.getSharedBox(
                            new Uint8Array(31) as ReadonlyUint8Array as PublicKey,
                            invalidReadonlyRawKey,
                            NONCE_UNGUARDED_SCOPE,
                            undefined,
                        ),
                    ).to.throw(Error);
                });
            });

            describe('TweetNaClBox', function () {
                // Headroom arrays.
                // Note: Uint8Arrays are 0-filled by default.
                const plainHeadroomArray = new Uint8Array(tweetnacl.plainHeadroom);
                const encryptedHeadroomArray = new Uint8Array(tweetnacl.encryptedHeadroom);

                describe('#encrypt()', function () {
                    const box = tweetnacl.getSecretBox(
                        wrapRawKey(
                            new Uint8Array(NACL_CONSTANTS.KEY_LENGTH),
                            NACL_CONSTANTS.KEY_LENGTH,
                        ).asReadonly(),
                        NONCE_UNGUARDED_SCOPE,
                        undefined,
                    ).raw;

                    it('should validate nonce length', function () {
                        expect(() =>
                            box.encrypt(
                                new Uint8Array(32) as RawEncryptedData,
                                new Uint8Array(32) as RawPlainData,
                                new Uint8Array(23) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                        expect(() =>
                            box.encrypt(
                                new Uint8Array(32) as RawEncryptedData,
                                new Uint8Array(32) as RawPlainData,
                                new Uint8Array(25) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                    });

                    it('should validate data lengths', function () {
                        expect(() =>
                            box.encrypt(
                                new Uint8Array(31) as RawEncryptedData,
                                new Uint8Array(32) as RawPlainData,
                                new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                        expect(() =>
                            box.encrypt(
                                new Uint8Array(32) as RawEncryptedData,
                                new Uint8Array(33) as RawPlainData,
                                new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                        expect(() =>
                            box.encrypt(
                                new Uint8Array(1) as RawEncryptedData,
                                new Uint8Array(1) as RawPlainData,
                                new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                    });
                });

                describe('#decrypt()', function () {
                    const box = tweetnacl.getSecretBox(
                        wrapRawKey(
                            new Uint8Array(NACL_CONSTANTS.KEY_LENGTH),
                            NACL_CONSTANTS.KEY_LENGTH,
                        ).asReadonly(),
                        NONCE_UNGUARDED_SCOPE,
                        undefined,
                    ).raw;

                    it('should validate nonce length', function () {
                        expect(() =>
                            box.decrypt(
                                new Uint8Array(32) as RawPlainData,
                                new Uint8Array(32) as RawEncryptedData,
                                new Uint8Array(23) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                        expect(() =>
                            box.decrypt(
                                new Uint8Array(32) as RawPlainData,
                                new Uint8Array(32) as RawEncryptedData,
                                new Uint8Array(25) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                    });

                    it('should validate data lengths', function () {
                        expect(() =>
                            box.decrypt(
                                new Uint8Array(31) as RawPlainData,
                                new Uint8Array(32) as RawEncryptedData,
                                new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                        expect(() =>
                            box.decrypt(
                                new Uint8Array(32) as RawPlainData,
                                new Uint8Array(33) as RawEncryptedData,
                                new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                        expect(() =>
                            box.decrypt(
                                new Uint8Array(1) as RawPlainData,
                                new Uint8Array(1) as RawEncryptedData,
                                new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce,
                            ),
                        ).to.throw(CryptoError);
                    });
                });

                describe('derived by #getSecretBox()', function () {
                    it('should pass test vectors', function () {
                        const vectors = getSecretBoxTestVectors(
                            tweetnacl.plainHeadroom,
                            tweetnacl.encryptedHeadroom,
                        );
                        for (const [key, nonce, plain, encrypted] of vectors) {
                            const buffer = new Uint8Array(encrypted.byteLength);
                            const box = tweetnacl.getSecretBox(
                                key,
                                NONCE_UNGUARDED_SCOPE,
                                undefined,
                            ).raw;

                            // Encrypt
                            box.encrypt(buffer as RawEncryptedData, plain, nonce);
                            // The first `encryptedHeadroom` bytes are expected to be 0.
                            expect(buffer.subarray(0, tweetnacl.encryptedHeadroom)).to.byteEqual(
                                encryptedHeadroomArray,
                            );
                            // Subsequent bytes should contain the encrypted data
                            expect(buffer.subarray(tweetnacl.encryptedHeadroom)).to.byteEqual(
                                encrypted.subarray(tweetnacl.encryptedHeadroom),
                            );

                            // Decrypt
                            box.decrypt(buffer as RawPlainData, encrypted, nonce);
                            // The first `plainHeadroom` bytes are expected to be 0.
                            expect(buffer.subarray(0, tweetnacl.plainHeadroom)).to.byteEqual(
                                plainHeadroomArray,
                            );
                            // Subsequent bytes should contain the encrypted data
                            expect(buffer.subarray(tweetnacl.plainHeadroom)).to.byteEqual(
                                plain.subarray(tweetnacl.plainHeadroom),
                            );
                        }
                    });
                });

                describe('derived by #getSharedBox()', function () {
                    const nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce;
                    const shared = new Uint8Array(1024);

                    it('should pass test vectors with separate buffers', function () {
                        const vectors = getSharedBoxTestVectors(
                            tweetnacl.plainHeadroom,
                            tweetnacl.encryptedHeadroom,
                        );
                        for (const [publicKey, secretKey, plain, encrypted] of vectors) {
                            expect(plain.byteLength).to.equal(encrypted.byteLength);
                            const buffer = shared.subarray(0, encrypted.byteLength);
                            const box = tweetnacl.getSharedBox(
                                publicKey,
                                secretKey,
                                NONCE_UNGUARDED_SCOPE,
                                undefined,
                            ).raw;

                            // Encrypt
                            box.encrypt(buffer as RawEncryptedData, plain, nonce);
                            // The first `encryptedHeadroom` bytes are expected to be 0.
                            expect(buffer.subarray(0, tweetnacl.encryptedHeadroom)).to.byteEqual(
                                encryptedHeadroomArray,
                            );
                            // Subsequent bytes should contain the encrypted data
                            expect(buffer.subarray(tweetnacl.encryptedHeadroom)).to.byteEqual(
                                encrypted.subarray(tweetnacl.encryptedHeadroom),
                            );

                            // Decrypt
                            box.decrypt(buffer as RawPlainData, encrypted, nonce);
                            // The first `plainHeadroom` bytes are expected to be 0.
                            expect(buffer.subarray(0, tweetnacl.plainHeadroom)).to.byteEqual(
                                plainHeadroomArray,
                            );
                            // Subsequent bytes should contain the plain data
                            expect(buffer.subarray(tweetnacl.plainHeadroom)).to.byteEqual(
                                plain.subarray(tweetnacl.plainHeadroom),
                            );
                        }
                    });

                    it('should pass test vectors with overlapping buffers', function () {
                        const vectors = getSharedBoxTestVectors(
                            tweetnacl.plainHeadroom,
                            tweetnacl.encryptedHeadroom,
                        );
                        for (const [publicKey, secretKey, plain, encrypted] of vectors) {
                            expect(plain.byteLength).to.equal(encrypted.byteLength);
                            const buffer = shared.subarray(0, encrypted.byteLength);
                            const box = tweetnacl.getSharedBox(
                                publicKey,
                                secretKey,
                                NONCE_UNGUARDED_SCOPE,
                                undefined,
                            ).raw;

                            // Encrypt
                            buffer.set(plain);
                            box.encrypt(buffer as RawEncryptedData, buffer as RawPlainData, nonce);
                            // The first `encryptedHeadroom` bytes are expected to be 0.
                            expect(buffer.subarray(0, tweetnacl.encryptedHeadroom)).to.byteEqual(
                                encryptedHeadroomArray,
                            );
                            // Subsequent bytes should contain the encrypted data
                            expect(buffer.subarray(tweetnacl.encryptedHeadroom)).to.byteEqual(
                                encrypted.subarray(tweetnacl.encryptedHeadroom),
                            );

                            // Decrypt
                            buffer.set(encrypted);
                            box.decrypt(buffer as RawPlainData, buffer as RawEncryptedData, nonce);
                            // The first `plainHeadroom` bytes are expected to be 0.
                            expect(buffer.subarray(0, tweetnacl.plainHeadroom)).to.byteEqual(
                                plainHeadroomArray,
                            );
                            // Subsequent bytes should contain the plain data
                            expect(buffer.subarray(tweetnacl.plainHeadroom)).to.byteEqual(
                                plain.subarray(tweetnacl.plainHeadroom),
                            );
                        }
                    });
                });
            });
        });
    });
}
