import {expect} from 'chai';

import {
    ensurePublicKey,
    NACL_CONSTANTS,
    type Nonce,
    NONCE_UNGUARDED_SCOPE,
    type PlainData,
    type PublicKey,
    wrapRawKey,
} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import type {ReadonlyUint8Array} from '~/common/types';
import {bytesToHex, hexToBytes} from '~/common/utils/byte';
import {type CryptoBoxTestCase, testCases} from '~/test/mocha/common/data/crypto-box-test-cases';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

const crypto = new TweetNaClBackend(pseudoRandomBytes);

/**
 * {@link CryptoBox} tests.
 */
export function run(): void {
    describe('CryptoBox', function () {
        it('should properly handle encryption in both secret and shared variants', function () {
            const actual = testCases.map((testCase): CryptoBoxTestCase => {
                const secretKey = wrapRawKey(
                    hexToBytes(testCase.secretKey),
                    NACL_CONSTANTS.KEY_LENGTH,
                ).asReadonly();
                const nonce = hexToBytes(testCase.nonce) as Nonce;
                const plainData = hexToBytes(testCase.data.plain) as PlainData;

                return {
                    ...testCase,
                    data: {
                        ...testCase.data,
                        encryptedWithSecretKeyEncryption: bytesToHex(
                            crypto
                                .getSecretBox(secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                                .encryptor(CREATE_BUFFER_TOKEN, plainData)
                                .encryptWithDangerousUnguardedNonce(nonce),
                        ),
                        encryptedWithPublicKeyEncryption: bytesToHex(
                            crypto
                                .getSharedBox(
                                    hexToBytes(
                                        testCase.publicKey,
                                    ) as ReadonlyUint8Array as PublicKey,
                                    secretKey,
                                    NONCE_UNGUARDED_SCOPE,
                                    undefined,
                                )
                                .encryptor(CREATE_BUFFER_TOKEN, plainData)
                                .encryptWithDangerousUnguardedNonce(nonce),
                        ),
                    },
                };
            });
            expect(actual).to.eql(testCases);
        });

        describe('using the shared box variant', function () {
            describe('for the same nonce', function () {
                it('should return the same encrypted data', function () {
                    for (const testCase of testCases) {
                        const secretKey = wrapRawKey(
                            hexToBytes(testCase.secretKey),
                            NACL_CONSTANTS.KEY_LENGTH,
                        ).asReadonly();
                        const publicKey = ensurePublicKey(hexToBytes(testCase.publicKey));
                        const plainData = hexToBytes(testCase.data.plain) as PlainData;

                        const [nonce, encryptedWithRandomNonce] = crypto
                            .getSharedBox(publicKey, secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithRandomNonce();

                        const encryptedWithGivenNonce = crypto
                            .getSharedBox(publicKey, secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithDangerousUnguardedNonce(nonce);

                        expect(encryptedWithRandomNonce).to.eql(encryptedWithGivenNonce);
                    }
                });
            });
        });

        describe('using the secret box variant', function () {
            describe('for the same nonce', function () {
                it('should return the same encrypted data', function () {
                    for (const testCase of testCases) {
                        const secretKey = wrapRawKey(
                            hexToBytes(testCase.secretKey),
                            NACL_CONSTANTS.KEY_LENGTH,
                        ).asReadonly();
                        const plainData = hexToBytes(testCase.data.plain) as PlainData;

                        const [nonce, encryptedWithRandomNonce] = crypto
                            .getSecretBox(secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithRandomNonce();

                        const encryptedWithGivenNonce = crypto
                            .getSecretBox(secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithDangerousUnguardedNonce(nonce);

                        expect(encryptedWithRandomNonce).to.eql(encryptedWithGivenNonce);
                    }
                });
            });

            describe('for', function () {
                const key1 = wrapRawKey(
                    hexToBytes('00'.repeat(NACL_CONSTANTS.KEY_LENGTH)),
                    NACL_CONSTANTS.KEY_LENGTH,
                ).asReadonly();
                const key2 = wrapRawKey(
                    hexToBytes('01'.repeat(NACL_CONSTANTS.KEY_LENGTH)),
                    NACL_CONSTANTS.KEY_LENGTH,
                ).asReadonly();
                const nonce1 = hexToBytes('00'.repeat(24)) as ReadonlyUint8Array as Nonce;
                const nonce2 = hexToBytes('01'.repeat(24)) as ReadonlyUint8Array as Nonce;
                const plainData = hexToBytes('abcdef') as PlainData;
                describe('different keys but same nonce', function () {
                    it('should return different encrypted data', function () {
                        const encryptedWithKey1 = crypto
                            .getSecretBox(key1, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithDangerousUnguardedNonce(nonce1);

                        const encryptedWithKey2 = crypto
                            .getSecretBox(key2, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithDangerousUnguardedNonce(nonce1);

                        expect(bytesToHex(encryptedWithKey1)).not.to.eql(
                            bytesToHex(encryptedWithKey2),
                        );
                    });
                });

                describe('same key but different nonces', function () {
                    it('should return different encrypted data', function () {
                        const encryptedWithKey1 = crypto
                            .getSecretBox(key1, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithDangerousUnguardedNonce(nonce1);

                        const encryptedWithKey2 = crypto
                            .getSecretBox(key1, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData)
                            .encryptWithDangerousUnguardedNonce(nonce2);

                        expect(bytesToHex(encryptedWithKey1)).not.to.eql(
                            bytesToHex(encryptedWithKey2),
                        );
                    });
                });
            });
        });
    });
}
