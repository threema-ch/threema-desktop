import {NonceScope} from '@threema/protocol/enum';
import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/conversion/hex-to-bytes';
import type {u64} from '@threema/ts-utils/integer/u64';
import {ValueObject} from '@threema/ts-utils/object/value-object';
import * as tweetnacl from 'tweetnacl';
import {describe, expect, it} from 'vitest';

import {NONCE_UNGUARDED_SCOPE} from '../backend.js';
import {blake2bHash} from '../blake2b/blake2b.js';
import {CREATE_BUFFER_TOKEN, type CryptoBox, SecureSharedBoxFactory} from '../box.js';
import {type ReadonlyRawKey, wrapRawKey} from '../key.js';
import type {INonceGuard, INonceService, NonceReused} from '../nonce.js';
import {
    type Cookie,
    ensurePublicKey,
    NACL_CONSTANTS,
    type Nonce,
    type NonceHash,
    type PlainData,
} from '../primitives.js';
import {createTestCryptoPrng} from '../utils/test/create-test-crypto-prng.js';

import {TweetNaClBackend} from './index.js';

const prng = createTestCryptoPrng();

const crypto = new TweetNaClBackend(prng);

/**
 * All strings (including `data`) are expected to be the hex representation of the byte array.
 */
interface CryptoBoxTestCase {
    secretKey: string;
    publicKey: string;
    nonce: string;
    data: {
        plain: string;
        encryptedWithSecretKeyEncryption: string;
        encryptedWithPublicKeyEncryption: string;
    };
}

const testCases: CryptoBoxTestCase[] = [
    {
        secretKey: '00'.repeat(32),
        publicKey: '00'.repeat(32),
        nonce: '00'.repeat(24),
        data: {
            plain: '00',
            encryptedWithSecretKeyEncryption: '42e45eb764a1b706d4776a849bc2526bc6',
            encryptedWithPublicKeyEncryption: 'a1b6d3b89a3b0d7babecaf1d9f21ba5387',
        },
    },
    {
        secretKey: '01'.repeat(32),
        publicKey: '00'.repeat(32),
        nonce: '00'.repeat(24),
        data: {
            plain: '00',
            encryptedWithSecretKeyEncryption: 'aa4f20a71316003ba2f60727f443d5e4de',
            encryptedWithPublicKeyEncryption: 'a1b6d3b89a3b0d7babecaf1d9f21ba5387',
        },
    },
    {
        secretKey: '00'.repeat(32),
        publicKey: '00'.repeat(32),
        nonce: '01'.repeat(24),
        data: {
            plain: '00',
            encryptedWithSecretKeyEncryption: '089f09cb7dc9ecea7169eca94228ecba50',
            encryptedWithPublicKeyEncryption: 'ece5f3db1c2eea81a1baf0e8054f81e51a',
        },
    },
    {
        secretKey: '1b35ed7e1ba9993171fe4a7eed30c2831905c3a583616d61e93782da900bf8ba',
        publicKey: 'ba3ff7104bf8e0e32f49717e639a8cb533530acace71d1d10d0bcef38847ac66',
        nonce: '8bd5ea94d8b3ed78c4111b35790b968b8ac89c4d9c19db15',
        data: {
            plain: '123abd',
            encryptedWithSecretKeyEncryption: '0b2e6d6435f6544ec82f12572aca6f222b30d0',
            encryptedWithPublicKeyEncryption: '0dfcab829dacfac306398a6821ee2a8a91e69d',
        },
    },
];

/** See {@link INonceGuard} */
class TestNonceGuard implements INonceGuard {
    public readonly processed = new ValueObject(false);

    public constructor(public readonly nonce: Nonce) {}

    public discard(): void {
        this.processed.value = true;
    }

    public commit(): void {
        this.processed.value = true;
    }
}

/**
 * See {@link INonceService}.
 *
 * Note: The tests below encrypt with explicitly given nonces, so the service only ever has to hand
 * out a guard; detecting an actual reuse is covered by the box unit tests in `../box.test.ts`.
 */
class TestNonceService implements INonceService {
    public checkAndRegisterNonce(
        scope: NonceScope,
        nonce: Nonce,
        debugToken?: string,
    ): INonceGuard | NonceReused {
        return new TestNonceGuard(nonce);
    }

    public getRandomNonce(scope: NonceScope, debugToken?: string): INonceGuard {
        return new TestNonceGuard(
            crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)) as Nonce,
        );
    }

    public getAllPersistedNonces(scope: NonceScope): ReadonlySet<NonceHash> {
        return new Set<NonceHash>();
    }

    public importNonces(scope: NonceScope, hashes: ReadonlySet<NonceHash>): void {
        // Not needed by the box.
    }
}

function readonlyKey(hex: string): ReadonlyRawKey<32> {
    return wrapRawKey(hexToBytes(hex), NACL_CONSTANTS.KEY_LENGTH).asReadonly();
}

function plainData(hex: string): PlainData {
    return hexToBytes(hex) as PlainData;
}

function hexNonce(hex: string): Nonce {
    return hexToBytes(hex) as Nonce;
}

/**
 * Encrypt a test case's plain data through a {@link SecureSharedBoxFactory}, returned as hex.
 *
 * Note: `debug` controls whether the factory's internal {@link ByteBuffer} is bogus-filled on
 * reset, which must not affect the result.
 */
function encryptWithFactory(testCase: CryptoBoxTestCase, debug: boolean): string {
    const factory = SecureSharedBoxFactory.consume(
        crypto,
        new TestNonceService(),
        NonceScope.CSP,
        wrapRawKey(hexToBytes(testCase.secretKey), NACL_CONSTANTS.KEY_LENGTH),
        {debug},
    );
    return bytesToHex(
        factory
            .getSharedBox(ensurePublicKey(hexToBytes(testCase.publicKey)))
            .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
            .encryptWithDangerousUnguardedNonce(hexNonce(testCase.nonce)),
    );
}

// Note: Unlike `../box.test.ts`, which drives the box logic through a stub cipher, these tests run
// the box over the real NaCl backend and pin the result against fixed, externally generated test
// cases. That is what makes them an end-to-end check of the box and the backend together.
describe('CryptoBox over the TweetNaCl backend', () => {
    it('encrypts the test cases with both secret-key and public-key encryption', () => {
        // Act
        const actual = testCases.map((testCase): CryptoBoxTestCase => {
            const secretKey = readonlyKey(testCase.secretKey);

            return {
                ...testCase,
                data: {
                    ...testCase.data,
                    encryptedWithSecretKeyEncryption: bytesToHex(
                        crypto
                            .getSecretBox(secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                            .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
                            .encryptWithDangerousUnguardedNonce(hexNonce(testCase.nonce)),
                    ),
                    encryptedWithPublicKeyEncryption: bytesToHex(
                        crypto
                            .getSharedBox(
                                ensurePublicKey(hexToBytes(testCase.publicKey)),
                                secretKey,
                                NONCE_UNGUARDED_SCOPE,
                                undefined,
                            )
                            .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
                            .encryptWithDangerousUnguardedNonce(hexNonce(testCase.nonce)),
                    ),
                },
            };
        });

        // Assert
        expect(actual).toStrictEqual(testCases);
    });

    describe('#encryptWithRandomNonce', () => {
        it('matches re-encrypting the shared box with the nonce it picked', () => {
            for (const testCase of testCases) {
                // Arrange
                const secretKey = readonlyKey(testCase.secretKey);
                const publicKey = ensurePublicKey(hexToBytes(testCase.publicKey));

                // Act
                const [randomNonce, encryptedWithRandomNonce] = crypto
                    .getSharedBox(publicKey, secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                    .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
                    .encryptWithRandomNonce(undefined);
                const encryptedWithGivenNonce = crypto
                    .getSharedBox(publicKey, secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                    .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
                    .encryptWithDangerousUnguardedNonce(randomNonce);

                // Assert
                expect(bytesToHex(encryptedWithGivenNonce)).toBe(
                    bytesToHex(encryptedWithRandomNonce),
                );
            }
        });

        it('matches re-encrypting the secret box with the nonce it picked', () => {
            for (const testCase of testCases) {
                // Arrange
                const secretKey = readonlyKey(testCase.secretKey);

                // Act
                const [randomNonce, encryptedWithRandomNonce] = crypto
                    .getSecretBox(secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                    .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
                    .encryptWithRandomNonce(undefined);
                const encryptedWithGivenNonce = crypto
                    .getSecretBox(secretKey, NONCE_UNGUARDED_SCOPE, undefined)
                    .encryptor(CREATE_BUFFER_TOKEN, plainData(testCase.data.plain))
                    .encryptWithDangerousUnguardedNonce(randomNonce);

                // Assert
                expect(bytesToHex(encryptedWithGivenNonce)).toBe(
                    bytesToHex(encryptedWithRandomNonce),
                );
            }
        });
    });

    describe('using the secret box variant', () => {
        const KEY_1 = '00'.repeat(NACL_CONSTANTS.KEY_LENGTH);
        const KEY_2 = '01'.repeat(NACL_CONSTANTS.KEY_LENGTH);
        const NONCE_1 = '00'.repeat(NACL_CONSTANTS.NONCE_LENGTH);
        const NONCE_2 = '01'.repeat(NACL_CONSTANTS.NONCE_LENGTH);
        const PLAIN = 'abcdef';

        function encrypt(key: string, nonceHex: string): string {
            return bytesToHex(
                crypto
                    .getSecretBox(readonlyKey(key), NONCE_UNGUARDED_SCOPE, undefined)
                    .encryptor(CREATE_BUFFER_TOKEN, plainData(PLAIN))
                    .encryptWithDangerousUnguardedNonce(hexNonce(nonceHex)),
            );
        }

        it('encrypts differently for different keys but the same nonce', () => {
            // Act & assert
            expect(encrypt(KEY_1, NONCE_1)).not.toBe(encrypt(KEY_2, NONCE_1));
        });

        it('encrypts differently for the same key but different nonces', () => {
            // Act & assert
            expect(encrypt(KEY_1, NONCE_1)).not.toBe(encrypt(KEY_1, NONCE_2));
        });
    });
});

describe('SecureSharedBoxFactory over the TweetNaCl backend', () => {
    type TestBox = CryptoBox<Cookie, Cookie, u64, u64, NonceScope>;

    /**
     * A factory consuming a test case's secret key.
     */
    function consumeSecretKeyOf(testCase: CryptoBoxTestCase): SecureSharedBoxFactory<TestBox> {
        return SecureSharedBoxFactory.consume(
            crypto,
            new TestNonceService(),
            NonceScope.CSP,
            wrapRawKey(hexToBytes(testCase.secretKey), NACL_CONSTANTS.KEY_LENGTH),
            {debug: false},
        );
    }

    // Tests whether `getSharedSecret` yields the same shared secret as TweetNaCl's underlying
    // implementation (`tweetnacl.box.before`). Because a shared secret is just 32 random-looking
    // bytes, this ensures our wrapper doesn't drift and yield incorrect values by mistake.
    it('yields the shared secret towards the peer', () => {
        for (const testCase of testCases) {
            // Arrange
            const peerPublicKey = hexToBytes(testCase.publicKey);
            const factory = consumeSecretKeyOf(testCase);
            // `tweetnacl.box.before` is the library's implementation of the step which combines the
            // two keys into the shared secret.
            const expectedSharedSecret = tweetnacl.box.before(
                peerPublicKey,
                hexToBytes(testCase.secretKey),
            );

            // Act
            //
            // Derive the shared secret from our secret key and the peer's public key.
            const shared = factory.getSharedSecret(ensurePublicKey(peerPublicKey));

            // Assert
            //
            // Expect the wrapper (`factory.getSharedSecret`) to return the same shared secret as
            // the independent implementation in this test, which uses the library's implementation
            // directly.
            expect(bytesToHex(shared.unwrap())).toBe(bytesToHex(expectedSharedSecret));
        }
    });

    // Same as the test above, but for subkeys derived from the shared secret (i.e., one layer
    // deeper).
    it('derives a subkey from the shared secret towards the peer', () => {
        const parameters = {personal: '3ma-test', salt: 'kdf'} as const;

        for (const testCase of testCases) {
            // Arrange
            const peerPublicKey = hexToBytes(testCase.publicKey);
            const factory = consumeSecretKeyOf(testCase);
            // Derive the expected shared secret using `tweetnacl.box.before` directly.
            const expectedSharedSecret = tweetnacl.box.before(
                peerPublicKey,
                hexToBytes(testCase.secretKey),
            );
            // Derive the expected subkey from the expected shared secret.
            const expectedDerivedKey = blake2bHash(
                32,
                wrapRawKey(expectedSharedSecret, NACL_CONSTANTS.KEY_LENGTH).asReadonly(),
                parameters,
            ).digest();

            // Act
            //
            // Derives the shared secret and then a subkey from it in one step.
            const derived = factory.deriveSharedKey(32, ensurePublicKey(peerPublicKey), parameters);

            // Assert
            //
            // Expect the wrapper (`factory.deriveSharedKey`) to return the same subkey from the
            // shared secret as the independent implementation in this test, which uses the
            // library's implementation directly.
            expect(bytesToHex(derived.unwrap())).toBe(bytesToHex(expectedDerivedKey));
        }
    });

    it('returns shared boxes matching the public-key encryption test cases', () => {
        // Act
        const actual = testCases.map((testCase) => encryptWithFactory(testCase, true));

        // Assert
        expect(actual).toStrictEqual(
            testCases.map((testCase) => testCase.data.encryptedWithPublicKeyEncryption),
        );
    });

    it('returns the same shared box whether or not the debug bogus-fill is enabled', () => {
        for (const testCase of testCases) {
            // Act
            const withDebug = encryptWithFactory(testCase, true);
            const withoutDebug = encryptWithFactory(testCase, false);

            // Assert
            expect(withDebug).toBe(withoutDebug);
            expect(withDebug).toBe(testCase.data.encryptedWithPublicKeyEncryption);
        }
    });
});
