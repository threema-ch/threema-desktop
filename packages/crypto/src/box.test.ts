// Note: The stub cipher below is built out of bitwise operations, which the shared config forbids
// by default.
/* eslint-disable no-bitwise */
import {NonceScope} from '@threema/protocol/enum';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {ByteBuffer} from '@threema/ts-utils/byte/byte-buffer';
import type {ByteLengthEncoder} from '@threema/ts-utils/byte/byte-encoder';
import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
import type {u53} from '@threema/ts-utils/integer/u53';
import type {u64} from '@threema/ts-utils/integer/u64';
import {ValueObject} from '@threema/ts-utils/object/value-object';
import {beforeEach, describe, expect, it} from 'vitest';

import {
    type CryptoBackend,
    type CryptoBoxBackend,
    NONCE_UNGUARDED_SCOPE,
    type NonceUnguardedScope,
} from './backend.js';
import {CREATE_BUFFER_TOKEN, CryptoBox, SecureSharedBoxFactory, SharedBoxFactory} from './box.js';
import {CryptoError} from './error.js';
import {type RawKey, type ReadonlyRawKey, wrapRawKey} from './key.js';
import {type INonceGuard, type INonceService, NONCE_REUSED, type NonceReused} from './nonce.js';
import {
    type Cookie,
    type EncryptedData,
    NACL_CONSTANTS,
    type Nonce,
    type NonceHash,
    type PlainData,
    type PublicKey,
    type RawEncryptedData,
    type RawPlainData,
} from './primitives.js';

// Note: These match the TweetNaCl secretbox headrooms, so that the box's headroom arithmetic is
// exercised the same way it is in the app.
const PLAIN_HEADROOM = 32;
const ENCRYPTED_HEADROOM = 16;
const MAC_LENGTH = PLAIN_HEADROOM - ENCRYPTED_HEADROOM;

/**
 * A deterministic keystream byte for the stub cipher below.
 */
function keystream(key: ReadonlyUint8Array, nonce: ReadonlyUint8Array, index: u53): u53 {
    const keyByte = key[index % key.byteLength] ?? 0;
    const nonceByte = nonce[index % nonce.byteLength] ?? 0;
    return (keyByte ^ nonceByte ^ ((index * 7 + 1) & 0xff)) & 0xff;
}

/**
 * A deterministic authentication tag over the plaintext, keyed by key and nonce.
 */
function computeTag(
    key: ReadonlyUint8Array,
    nonce: ReadonlyUint8Array,
    plaintext: ReadonlyUint8Array,
): Uint8Array {
    const tag = new Uint8Array(MAC_LENGTH);
    for (let index = 0; index < plaintext.byteLength; ++index) {
        const offset = index % MAC_LENGTH;
        tag[offset] = ((tag[offset] ?? 0) ^ (plaintext[index] ?? 0)) & 0xff;
    }
    // Fold the key and the nonce in completely, so that a change to any byte of either (e.g. to the
    // sequence number in the tail of a CSP-like nonce) fails authentication.
    for (const [source, seed] of [
        [key, 0x11],
        [nonce, 0x71],
    ] as const) {
        for (let index = 0; index < source.byteLength; ++index) {
            const offset = index % MAC_LENGTH;
            tag[offset] =
                ((tag[offset] ?? 0) ^ (source[index] ?? 0) ^ ((index + seed) & 0xff)) & 0xff;
        }
    }
    return tag;
}

/**
 * A stub box backend implementing the same data layout contract as the real one: a plaintext with
 * {@link PLAIN_HEADROOM} bytes upfront maps onto a ciphertext with {@link ENCRYPTED_HEADROOM} bytes
 * upfront followed by a {@link MAC_LENGTH}-byte tag.
 *
 * IMPORTANT: This is **not** a cipher. It exists so that the box logic (headroom arithmetic, nonce
 * construction, view slicing and error paths) can be tested without pulling a real crypto backend
 * into this package. Real cryptographic behaviour is covered by `tweetnacl/crypto-box.test.ts`,
 * which runs the box over the real NaCl backend against fixed test cases.
 *
 * Like the real backend, this one only requires input and output to be of the same size. It works
 * whether they alias (which is what {@link CryptoBox} does) or are distinct buffers.
 */
class StubBoxBackend implements CryptoBoxBackend {
    readonly #_key: ReadonlyRawKey<32>;

    public constructor(key: ReadonlyRawKey<32>) {
        this.#_key = key;
    }

    public encrypt(encrypted: RawEncryptedData, plain: RawPlainData, nonce: Nonce): void {
        if (encrypted.byteLength !== plain.byteLength) {
            throw new CryptoError('box.encrypt with data length mismatch');
        }
        const key = this.#_key.unwrap();
        const plainBody = plain.subarray(PLAIN_HEADROOM);
        const encryptedBody = encrypted.subarray(PLAIN_HEADROOM);
        // Note: The tag must be computed before anything is written, since the two buffers may
        // alias.
        const tag = computeTag(key, nonce, plainBody);
        for (let index = 0; index < plainBody.byteLength; ++index) {
            encryptedBody[index] = ((plainBody[index] ?? 0) ^ keystream(key, nonce, index)) & 0xff;
        }
        encrypted.subarray(ENCRYPTED_HEADROOM, PLAIN_HEADROOM).set(tag);
    }

    public decrypt(plain: RawPlainData, encrypted: RawEncryptedData, nonce: Nonce): void {
        if (plain.byteLength !== encrypted.byteLength) {
            throw new CryptoError('box.decrypt with data length mismatch');
        }
        const key = this.#_key.unwrap();
        const tag = Uint8Array.from(encrypted.subarray(ENCRYPTED_HEADROOM, PLAIN_HEADROOM));
        const encryptedBody = encrypted.subarray(PLAIN_HEADROOM);
        const plainBody = plain.subarray(PLAIN_HEADROOM);
        for (let index = 0; index < encryptedBody.byteLength; ++index) {
            plainBody[index] = ((encryptedBody[index] ?? 0) ^ keystream(key, nonce, index)) & 0xff;
        }
        if (!byteEquals(tag, computeTag(key, nonce, plainBody))) {
            throw new CryptoError('box.decrypt authentication failed');
        }
    }
}

/**
 * A crypto backend with deterministic "randomness", so that tests are reproducible.
 */
class StubCryptoBackend implements CryptoBackend {
    public readonly plainHeadroom = PLAIN_HEADROOM;
    public readonly encryptedHeadroom = ENCRYPTED_HEADROOM;

    private _counter = 0;

    public randomBytes<T extends ArrayBufferView>(buffer: T): T {
        const array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        for (let index = 0; index < array.byteLength; ++index) {
            this._counter = (this._counter + 0x3b) & 0xff;
            array[index] = this._counter;
        }
        return buffer;
    }

    public verifyEd25519Signature(): void {
        throw new CryptoError('Not implemented by the stub backend');
    }

    public derivePublicKey(secretKey: ReadonlyRawKey<32>): PublicKey {
        const secret = secretKey.unwrap();
        const publicKey = new Uint8Array(NACL_CONSTANTS.KEY_LENGTH);
        for (let index = 0; index < publicKey.byteLength; ++index) {
            publicKey[index] = ((secret[index] ?? 0) ^ 0x5a) & 0xff;
        }
        return publicKey as ReadonlyUint8Array as PublicKey;
    }

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
        return new CryptoBox(this, nonceService, new StubBoxBackend(secretKey), nonceScope);
    }

    public getSharedKey(publicKey: PublicKey, secretKey: ReadonlyRawKey<32>): RawKey<32> {
        const secret = secretKey.unwrap();
        const shared = new Uint8Array(NACL_CONSTANTS.KEY_LENGTH);
        for (let index = 0; index < shared.byteLength; ++index) {
            shared[index] = ((publicKey[index] ?? 0) + (secret[index] ?? 0)) & 0xff;
        }
        return wrapRawKey(shared, NACL_CONSTANTS.KEY_LENGTH);
    }

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
            new StubBoxBackend(this.getSharedKey(publicKey, secretKey).asReadonly()),
            nonceScope,
        );
    }
}

/** See {@link INonceGuard} */
class StubNonceGuard implements INonceGuard {
    public readonly processed = new ValueObject(false);

    public constructor(public readonly nonce: Nonce) {}

    public discard(): void {
        this.processed.value = true;
    }

    public commit(): void {
        this.processed.value = true;
    }
}

/** See {@link INonceService} */
class StubNonceService implements INonceService {
    /** Every nonce handed out or registered, in order. */
    public readonly seen: Nonce[] = [];

    /** Set to `true` to make the next check report the nonce as reused. */
    public reused = false;

    public constructor(private readonly _crypto: CryptoBackend) {}

    public checkAndRegisterNonce(
        scope: NonceScope,
        nonce: Nonce,
        debugToken?: string,
    ): INonceGuard | NonceReused {
        if (this.reused) {
            return NONCE_REUSED;
        }
        this.seen.push(nonce);
        return new StubNonceGuard(nonce);
    }

    public getRandomNonce(scope: NonceScope, debugToken?: string): INonceGuard {
        const nonce = this._crypto.randomBytes(
            new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH),
        ) as Nonce;
        this.seen.push(nonce);
        return new StubNonceGuard(nonce);
    }

    public getAllPersistedNonces(scope: NonceScope): ReadonlySet<NonceHash> {
        return new Set<NonceHash>();
    }

    public importNonces(scope: NonceScope, hashes: ReadonlySet<NonceHash>): void {
        // Not needed by the box.
    }
}

type TestCookie = Cookie;
type TestSequenceNumber = u64;

let crypto: StubCryptoBackend;
let nonces: StubNonceService;

function readonlyKey(fill: u53 = 0x11): ReadonlyRawKey<32> {
    return wrapRawKey(
        new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(fill),
        NACL_CONSTANTS.KEY_LENGTH,
    ).asReadonly();
}

/** An unguarded box, i.e. one that needs no nonce service. */
function unguardedBox(
    fill?: u53,
): CryptoBox<TestCookie, TestCookie, TestSequenceNumber, TestSequenceNumber, NonceUnguardedScope> {
    return crypto.getSecretBox(readonlyKey(fill), NONCE_UNGUARDED_SCOPE, undefined);
}

/** A guarded box, i.e. one whose nonces are checked by the nonce service. */
function guardedBox(
    fill?: u53,
): CryptoBox<TestCookie, TestCookie, TestSequenceNumber, TestSequenceNumber, NonceScope> {
    return crypto.getSecretBox<
        TestCookie,
        TestCookie,
        TestSequenceNumber,
        TestSequenceNumber,
        NonceScope
    >(readonlyKey(fill), NonceScope.CSP, nonces);
}

function message(...values: readonly u53[]): PlainData {
    return Uint8Array.from(values) as PlainData;
}

function cookie(fill: u53): TestCookie {
    return new Uint8Array(16).fill(fill) as TestCookie;
}

beforeEach(() => {
    crypto = new StubCryptoBackend();
    nonces = new StubNonceService(crypto);
});

describe('StubBoxBackend', () => {
    it('round trips through separate input and output buffers', () => {
        // Arrange
        const backend = new StubBoxBackend(readonlyKey());
        const nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(0x42) as Nonce;
        const plain = new Uint8Array(PLAIN_HEADROOM + 3) as RawPlainData;
        plain.set([1, 2, 3], PLAIN_HEADROOM);
        const encrypted = new Uint8Array(plain.byteLength) as RawEncryptedData;
        const decrypted = new Uint8Array(plain.byteLength) as RawPlainData;

        // Act
        backend.encrypt(encrypted, plain, nonce);
        backend.decrypt(decrypted, encrypted, nonce);

        // Assert
        expect([...decrypted.subarray(PLAIN_HEADROOM)]).toStrictEqual([1, 2, 3]);
        // The input buffer must be left untouched
        expect([...plain.subarray(PLAIN_HEADROOM)]).toStrictEqual([1, 2, 3]);
    });
});

describe('CryptoBox', () => {
    it('reports the encryptor headroom as a nonce plus the plain headroom', () => {
        // Assert
        expect(unguardedBox().encryptorHeadroom).toBe(NACL_CONSTANTS.NONCE_LENGTH + PLAIN_HEADROOM);
    });

    it('exposes the backend, nonce service and nonce scope it was created with', () => {
        // Arrange
        const box = guardedBox();

        // Assert
        expect(box.crypto).toBe(crypto);
        expect(box.nonceService).toBe(nonces);
        expect(box.nonceScope).toBe(NonceScope.CSP);
        expect(unguardedBox().nonceService).toBeUndefined();
    });
});

describe('encrypt/decrypt round trip', () => {
    it('round trips with a CSP-like nonce, allocating its own buffer', () => {
        // Arrange
        const box = unguardedBox();
        const payload = message(1, 2, 3, 4, 5);
        const serverCookie = cookie(0xaa);
        const sn = 7n as TestSequenceNumber;

        // Act
        const encrypted = box
            .encryptor(CREATE_BUFFER_TOKEN, payload)
            .encryptWithCspNonce(serverCookie, sn);
        const {plainData, nonceGuard} = box
            .decryptorWithCspNonce(CREATE_BUFFER_TOKEN, serverCookie, sn, encrypted)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([1, 2, 3, 4, 5]);
        expect(nonceGuard).toBeUndefined();
    });

    it('round trips with a CSP-like nonce through a shared byte buffer', () => {
        // Arrange
        const box = unguardedBox();
        const buffer = new ByteBuffer(new Uint8Array(1024), {debug: true});
        const payload = message(9, 8, 7);
        const serverCookie = cookie(0x0f);
        const sn = 1n as TestSequenceNumber;

        // Act
        const encrypted = box.encryptor(buffer, payload).encryptWithCspNonce(serverCookie, sn);
        const copy = Uint8Array.from(encrypted) as EncryptedData;
        buffer.reset();
        const {plainData} = box
            .decryptorWithCspNonce(buffer, serverCookie, sn, copy)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([9, 8, 7]);
    });

    it('fails to decrypt when the CSP sequence number does not match', () => {
        // Arrange
        const box = unguardedBox();
        const serverCookie = cookie(0x33);
        const encrypted = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithCspNonce(serverCookie, 1n as TestSequenceNumber);

        // Act & assert
        expect(() =>
            box
                .decryptorWithCspNonce(
                    CREATE_BUFFER_TOKEN,
                    serverCookie,
                    2n as TestSequenceNumber,
                    encrypted,
                )
                .decrypt(undefined),
        ).toThrow(CryptoError);
    });

    it('round trips with an externally provided nonce', () => {
        // Arrange
        const box = unguardedBox();
        const nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(0x5e) as Nonce;

        // Act
        const encrypted = box
            .encryptor(CREATE_BUFFER_TOKEN, message(4, 2))
            .encryptWithDangerousUnguardedNonce(nonce);
        const {plainData} = box
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([4, 2]);
    });

    it('round trips with an externally provided nonce through a shared byte buffer', () => {
        // Arrange
        const box = unguardedBox();
        const buffer = new ByteBuffer(new Uint8Array(512), {debug: false});
        const nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(0x11) as Nonce;
        const encrypted = Uint8Array.from(
            box
                .encryptor(CREATE_BUFFER_TOKEN, message(6, 6, 6))
                .encryptWithDangerousUnguardedNonce(nonce),
        ) as EncryptedData;

        // Act
        const {plainData} = box.decryptorWithNonce(buffer, nonce, encrypted).decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([6, 6, 6]);
    });

    it('round trips with a random nonce placed ahead of the cipher-text', () => {
        // Arrange
        const box = unguardedBox();

        // Act
        const encryptedWithNonceAhead = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 1, 2, 3, 5, 8))
            .encryptWithRandomNonceAhead(undefined);
        const {plainData} = box
            .decryptorWithNonceAhead(CREATE_BUFFER_TOKEN, encryptedWithNonceAhead)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([1, 1, 2, 3, 5, 8]);
    });

    it('returns the random nonce alongside the cipher-text', () => {
        // Arrange
        const box = unguardedBox();

        // Act
        const [nonce, encrypted] = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2))
            .encryptWithRandomNonce(undefined);

        // Assert
        expect(nonce.byteLength).toBe(NACL_CONSTANTS.NONCE_LENGTH);
        const {plainData} = box
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted)
            .decrypt(undefined);
        expect([...plainData]).toStrictEqual([1, 2]);
    });

    it('round trips an empty message', () => {
        // Arrange
        const box = unguardedBox();

        // Act
        const [nonce, encrypted] = box
            .encryptor(CREATE_BUFFER_TOKEN, message())
            .encryptWithRandomNonce(undefined);
        const {plainData} = box
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted)
            .decrypt(undefined);

        // Assert
        expect(plainData.byteLength).toBe(0);
    });

    it('cannot be decrypted with a box holding a different key', () => {
        // Arrange
        const nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(0x77) as Nonce;
        const encrypted = unguardedBox(0x11)
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithDangerousUnguardedNonce(nonce);

        // Act & assert
        expect(() =>
            unguardedBox(0x22)
                .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted)
                .decrypt(undefined),
        ).toThrow('Decryption failed');
    });
});

describe('CryptoBox#encryptor', () => {
    it('encodes through a byte length encoder when no buffer is provided', () => {
        // Arrange
        const box = unguardedBox();
        const encoder: ByteLengthEncoder = {
            byteLength: () => 3,
            encode: (array) => {
                array.set([7, 7, 7], 0);
                return array.subarray(0, 3);
            },
        };

        // Act
        const [nonce, encrypted] = box
            .encryptor(CREATE_BUFFER_TOKEN, encoder)
            .encryptWithRandomNonce(undefined);
        const {plainData} = box
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([7, 7, 7]);
    });

    it('encodes through a byte encoder when a buffer is provided', () => {
        // Arrange
        const box = unguardedBox();
        const buffer = new ByteBuffer(new Uint8Array(256), {debug: false});

        // Act
        const [nonce, encrypted] = box
            .encryptor(buffer, (array: Uint8Array) => {
                array.set([3, 1, 4, 1], 0);
                return array.subarray(0, 4);
            })
            .encryptWithRandomNonce(undefined);
        const copy = Uint8Array.from(encrypted) as EncryptedData;
        buffer.reset();
        const {plainData} = box
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, copy)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([3, 1, 4, 1]);
    });

    it('exposes the plain-text view before encrypting', () => {
        // Arrange
        const encryptor = unguardedBox().encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3));

        // Assert
        expect([...encryptor.plain]).toStrictEqual([1, 2, 3]);
    });

    it('refuses to hand out the plain-text view after encrypting', () => {
        // Arrange
        const encryptor = unguardedBox().encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3));
        encryptor.encryptWithRandomNonce(undefined);

        // Assert
        expect(() => encryptor.plain).toThrow('Cannot access plain-text, data already encrypted');
    });

    it('refuses to encrypt twice', () => {
        // Arrange
        const encryptor = unguardedBox().encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3));
        encryptor.encryptWithRandomNonce(undefined);

        // Assert
        expect(() => encryptor.encryptWithRandomNonce(undefined)).toThrow(
            'Cannot encrypt, data already encrypted',
        );
    });
});

describe('CryptoBoxDecryptor', () => {
    it('exposes the cipher-text view before decrypting', () => {
        // Arrange
        const box = unguardedBox();
        const [nonce, encrypted] = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithRandomNonce(undefined);
        const decryptor = box.decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted);

        // Assert
        expect(decryptor.encrypted.byteLength).toBe(MAC_LENGTH + 3);
    });

    it('refuses to hand out the cipher-text view after decrypting', () => {
        // Arrange
        const box = unguardedBox();
        const [nonce, encrypted] = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithRandomNonce(undefined);
        const decryptor = box.decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted);
        decryptor.decrypt(undefined);

        // Assert
        expect(() => decryptor.encrypted).toThrow(
            'Cannot access cipher-text, data already decrypted',
        );
    });

    it('refuses to decrypt twice', () => {
        // Arrange
        const box = unguardedBox();
        const [nonce, encrypted] = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithRandomNonce(undefined);
        const decryptor = box.decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted);
        decryptor.decrypt(undefined);

        // Assert
        expect(() => decryptor.decrypt(undefined)).toThrow(
            'Cannot decrypt, data already decrypted',
        );
    });

    it('wraps a backend decryption failure with the original error as cause', () => {
        // Arrange
        const box = unguardedBox();
        const nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(0x01) as Nonce;
        const encrypted = Uint8Array.from(
            box
                .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
                .encryptWithDangerousUnguardedNonce(nonce),
        ) as EncryptedData;
        // Tamper with the authentication tag
        encrypted[0] = ((encrypted[0] ?? 0) ^ 0xff) & 0xff;

        // Act
        let caught: unknown;
        try {
            box.decryptorWithNonce(CREATE_BUFFER_TOKEN, nonce, encrypted).decrypt(undefined);
        } catch (error) {
            caught = error;
        }

        // Assert
        expect(caught).toBeInstanceOf(CryptoError);
        expect((caught as CryptoError).message).toBe('Decryption failed');
        expect((caught as CryptoError).cause).toBeInstanceOf(CryptoError);
    });
});

describe('nonce-guarded boxes', () => {
    it('registers the nonce with the nonce service when decrypting', () => {
        // Arrange
        const box = guardedBox();
        const encryptedWithNonceAhead = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithRandomNonceAhead('encrypt');

        // Act
        const {nonceGuard, plainData} = box
            .decryptorWithNonceAhead(CREATE_BUFFER_TOKEN, encryptedWithNonceAhead)
            .decrypt('decrypt');

        // Assert
        expect([...plainData]).toStrictEqual([1, 2, 3]);
        expect(nonceGuard.nonce.byteLength).toBe(NACL_CONSTANTS.NONCE_LENGTH);
        expect(nonceGuard.processed.value).toBe(false);
    });

    it('commits the nonce guard when encrypting with a random nonce', () => {
        // Arrange
        const box = guardedBox();

        // Act
        box.encryptor(CREATE_BUFFER_TOKEN, message(1)).encryptWithRandomNonce('encrypt');

        // Assert
        expect(nonces.seen).toHaveLength(1);
    });

    it('takes the random nonce from the nonce service, not from the backend', () => {
        // Arrange
        const box = guardedBox();

        // Act
        const encryptedWithNonceAhead = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2))
            .encryptWithRandomNonceAhead('encrypt');

        // Assert
        const nonceAhead = encryptedWithNonceAhead.subarray(0, NACL_CONSTANTS.NONCE_LENGTH);
        expect(byteEquals(nonceAhead, nonces.seen[0] ?? new Uint8Array())).toBe(true);
    });

    it('refuses to decrypt a nonce that the nonce service reports as reused', () => {
        // Arrange
        const box = guardedBox();
        const encryptedWithNonceAhead = box
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithRandomNonceAhead('encrypt');
        nonces.reused = true;

        // Act & assert
        expect(() =>
            box
                .decryptorWithNonceAhead(CREATE_BUFFER_TOKEN, encryptedWithNonceAhead)
                .decrypt('decrypt'),
        ).toThrow('Decryption failed, nonce reused!');
    });
});

describe('SharedBoxFactory', () => {
    it('derives the public key from the secret it consumes', () => {
        // Arrange
        const factory = new SharedBoxFactory<
            CryptoBox<
                TestCookie,
                TestCookie,
                TestSequenceNumber,
                TestSequenceNumber,
                NonceUnguardedScope
            >
        >(crypto, readonlyKey(0x01));

        // Assert
        expect(factory.public.byteLength).toBe(NACL_CONSTANTS.KEY_LENGTH);
        expect(factory.public[0]).toBe(0x01 ^ 0x5a);
    });

    it('produces a shared box that round trips against the peer', () => {
        // Arrange
        const ours = readonlyKey(0x01);
        const theirs = readonlyKey(0x02);
        const ourFactory = new SharedBoxFactory<
            CryptoBox<
                TestCookie,
                TestCookie,
                TestSequenceNumber,
                TestSequenceNumber,
                NonceUnguardedScope
            >
        >(crypto, ours);
        const theirFactory = new SharedBoxFactory<
            CryptoBox<
                TestCookie,
                TestCookie,
                TestSequenceNumber,
                TestSequenceNumber,
                NonceUnguardedScope
            >
        >(crypto, theirs);

        // Act
        const ourBox = ourFactory.getSharedBox(
            theirFactory.public,
            NONCE_UNGUARDED_SCOPE,
            undefined,
        );
        const encryptedWithNonceAhead = ourBox
            .encryptor(CREATE_BUFFER_TOKEN, message(1, 2, 3))
            .encryptWithRandomNonceAhead(undefined);
        const theirBox = crypto.getSecretBox<
            TestCookie,
            TestCookie,
            TestSequenceNumber,
            TestSequenceNumber,
            NonceUnguardedScope
        >(
            crypto.getSharedKey(theirFactory.public, ours).asReadonly(),
            NONCE_UNGUARDED_SCOPE,
            undefined,
        );
        const {plainData} = theirBox
            .decryptorWithNonceAhead(CREATE_BUFFER_TOKEN, encryptedWithNonceAhead)
            .decrypt(undefined);

        // Assert
        expect([...plainData]).toStrictEqual([1, 2, 3]);
    });
});

describe('SecureSharedBoxFactory', () => {
    type TestBox = CryptoBox<
        TestCookie,
        TestCookie,
        TestSequenceNumber,
        TestSequenceNumber,
        NonceScope
    >;

    function rawSecret(fill: u53 = 0x03): RawKey<32> {
        return wrapRawKey(
            new Uint8Array(NACL_CONSTANTS.KEY_LENGTH).fill(fill),
            NACL_CONSTANTS.KEY_LENGTH,
        );
    }

    function consume(
        secret: RawKey<32>,
        options: {readonly debug: boolean},
    ): SecureSharedBoxFactory<TestBox> {
        return SecureSharedBoxFactory.consume<TestBox, NonceScope>(
            crypto,
            nonces,
            NonceScope.CSP,
            secret,
            options,
        );
    }

    it('derives the public key and purges the consumed secret', () => {
        // Arrange
        const secret = rawSecret(0x03);

        // Act
        const factory = consume(secret, {debug: true});

        // Assert
        expect(factory.public.byteLength).toBe(NACL_CONSTANTS.KEY_LENGTH);
        expect(factory.public[0]).toBe(0x03 ^ 0x5a);
        expect(() => secret.unwrap()).toThrow('Cannot unwrap, key purged');
    });

    it('yields the same shared secret on repeated calls', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: true});
        const peer = crypto.derivePublicKey(readonlyKey(0x09));

        // Act
        const first = factory.getSharedSecret(peer);
        const second = factory.getSharedSecret(peer);

        // Assert
        expect(byteEquals(first.unwrap(), second.unwrap())).toBe(true);
    });

    it('derives a subkey from the shared secret', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: true});
        const peer = crypto.derivePublicKey(readonlyKey(0x09));

        // Act
        const derived = factory.deriveSharedKey(32, peer, {personal: '3ma-test', salt: 'kdf'});

        // Assert
        expect(derived.length).toBe(32);
        expect(derived.unwrap().byteLength).toBe(32);
    });

    it('produces a shared box bound to the configured nonce scope', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: true});
        const peer = crypto.derivePublicKey(readonlyKey(0x09));

        // Act
        const box = factory.getSharedBox(peer);

        // Assert
        expect(box.nonceScope).toBe(NonceScope.CSP);
        expect(box.nonceService).toBe(nonces);
    });

    it('exposes the secret key only for the lifetime of the executor', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: true});

        // Act
        let captured: RawKey<32> | undefined;
        const inside = factory.runWithKey((key) => {
            captured = key;
            return key.unwrap().byteLength;
        });

        // Assert
        expect(inside).toBe(NACL_CONSTANTS.KEY_LENGTH);
        expect(() => captured?.unwrap()).toThrow('Cannot unwrap, key purged');
    });

    it('recovers the original secret key through the obfuscation', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: true});

        // Act
        const recovered = factory.runWithKey((key) => Uint8Array.from(key.unwrap()));

        // Assert
        expect([...recovered]).toStrictEqual([...new Uint8Array(32).fill(0x03)]);
    });

    it('bogus-fills its internal buffer on reset when debug is requested', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: true});

        // Act
        const view = factory.runWithKey((key) => key.unwrap());

        // Assert
        expect([...view]).toStrictEqual([...new Uint8Array(32).fill(0x2e)]);
    });

    it('purges but does not bogus-fill its internal buffer when debug is off', () => {
        // Arrange
        const factory = consume(rawSecret(0x03), {debug: false});

        // Act
        const view = factory.runWithKey((key) => key.unwrap());

        // Assert
        expect([...view]).toStrictEqual([...new Uint8Array(32).fill(0x23)]);
    });
});
