import {
    type Cookie,
    type CryptoBackend,
    type CryptoBoxBackend,
    type EncryptedData,
    type EncryptedDataWithNonceAhead,
    isNonce,
    NACL_CONSTANTS,
    type Nonce,
    NONCE_UNGUARDED_SCOPE,
    type NonceUnguardedScope,
    type PlainData,
    type PublicKey,
    type RawEncryptedData,
    type RawKey,
    type RawPlainData,
    type ReadonlyRawKey,
    wrapRawKey,
} from '~/common/crypto';
import {type Blake2bKeyLength, type Blake2bParameters, deriveKey} from '~/common/crypto/blake2b';
import {type INonceGuard, type INonceService, NONCE_REUSED} from '~/common/crypto/nonce';
import type {NonceScope} from '~/common/enum';
import {CryptoError} from '~/common/error';
import type {ByteEncoder, ByteLengthEncoder, u53, u64} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {byteView} from '~/common/utils/byte';
import {ByteBuffer} from '~/common/utils/byte-buffer';

/**
 * Instruct the encryptor/decryptor to create a byte buffer as needed.
 */
export const CREATE_BUFFER_TOKEN = Symbol('create-buffer-token');
export type CreateBufferToken = typeof CREATE_BUFFER_TOKEN;

export class CryptoBoxDecryptor<
    DCK extends Cookie,
    DSN extends u64,
    TNonceScope extends NonceScope | NonceUnguardedScope,
> {
    private readonly _box: CryptoBox<DCK, never, DSN, never, TNonceScope>;
    private readonly _array: Uint8Array;
    private readonly _nonce: Nonce;
    private _encrypted?: EncryptedData;

    public constructor(
        box: CryptoBox<DCK, never, DSN, never, TNonceScope>,
        array: Uint8Array,
        nonce: Nonce,
    ) {
        this._box = box;
        this._array = array;
        this._nonce = nonce;
        this._encrypted = array.subarray(this._box.crypto.encryptedHeadroom) as EncryptedData;
    }

    public get encrypted(): EncryptedData {
        if (this._encrypted === undefined) {
            throw new CryptoError('Cannot access cipher-text, data already decrypted');
        }
        return this._encrypted;
    }

    /**
     * Decrypt the encrypted box.
     *
     * @returns The decrypted data and the nonceguard (if guarded scope).
     * @throws {CryptoError} if data is already decrypted.
     * @throws {CryptoError} if decryption fails.
     * @throws {CryptoError} if nonce re-use was detected.
     */
    public decrypt(): {
        nonceGuard: TNonceScope extends NonceUnguardedScope ? undefined : INonceGuard;
        plainData: PlainData;
    } {
        // Ensure we haven't already decrypted
        if (this._encrypted === undefined) {
            throw new CryptoError('Cannot decrypt, data already decrypted');
        }

        // Ensure the nonce is unique
        const nonceScope = this._box.nonceScope;
        let nonceGuard;
        if (nonceScope !== NONCE_UNGUARDED_SCOPE) {
            assert(
                this._box.nonceService !== undefined,
                'NonceService must be defined since nonceScope is not NonceUnguardedScope',
            );
            nonceGuard = this._box.nonceService.checkAndRegisterNonce(nonceScope, this._nonce);
            if (nonceGuard === NONCE_REUSED) {
                throw new CryptoError('Decryption failed, nonce reused!');
            }
        }

        // Decrypt data in-place
        try {
            this._box.raw.decrypt(
                this._array as RawPlainData,
                this._array as RawEncryptedData,
                this._nonce,
            );
        } catch (error) {
            throw new CryptoError(`Decryption failed`, {from: error});
        }

        // Remove cipher-text view
        this._encrypted = undefined;

        const plainData = this._array.subarray(this._box.crypto.plainHeadroom) as PlainData;
        // Return plain-text view
        return {nonceGuard, plainData} as {
            nonceGuard: TNonceScope extends NonceUnguardedScope ? undefined : INonceGuard;
            plainData: PlainData;
        };
    }
}

export class CryptoBoxEncryptor<
    ECK extends Cookie,
    ESN extends u64,
    TNonceScope extends NonceScope | NonceUnguardedScope,
> {
    private readonly _box: CryptoBox<never, ECK, never, ESN, TNonceScope>;
    private readonly _array: Uint8Array;
    private _plain?: PlainData;

    public constructor(box: CryptoBox<never, ECK, never, ESN, TNonceScope>, array: Uint8Array) {
        this._box = box;
        this._array = array;
        this._plain = this._array.subarray(
            NACL_CONSTANTS.NONCE_LENGTH + this._box.crypto.plainHeadroom,
        ) as PlainData;
    }

    public get plain(): PlainData {
        if (this._plain === undefined) {
            throw new CryptoError('Cannot access plain-text, data already encrypted');
        }
        return this._plain;
    }

    public encryptWithDangerousUnguardedNonce(nonce: Nonce): EncryptedData {
        // Encrypt data in-place
        this._encrypt(nonce);

        // Return cipher-text view
        return this._array.subarray(
            NACL_CONSTANTS.NONCE_LENGTH + this._box.crypto.encryptedHeadroom,
        ) as EncryptedData;
    }

    public encryptWithCspNonce(cookie: ECK, sn: ESN): EncryptedData {
        // Set CSP-like nonce
        const nonce = this._array.subarray(0, NACL_CONSTANTS.NONCE_LENGTH) as Nonce;
        nonce.set(cookie);
        byteView(DataView, nonce).setBigUint64(16, sn, true);

        // Encrypt data in-place
        this._encrypt(nonce);

        // Return cipher-text view
        return this._array.subarray(
            NACL_CONSTANTS.NONCE_LENGTH + this._box.crypto.encryptedHeadroom,
        ) as EncryptedData;
    }

    public encryptWithRandomNonce(): [nonce: Nonce, encrypted: EncryptedData] {
        // Generate cryptographically secure random nonce and encrypt data in-place
        const nonceOrNonceGuard = this._encryptInPlaceWithRandomNonce();
        let nonce;
        if (isNonce(nonceOrNonceGuard)) {
            nonce = nonceOrNonceGuard;
        } else {
            nonce = nonceOrNonceGuard.nonce;
            nonceOrNonceGuard.commit();
        }

        // Return nonce and cipher-text view
        const encrypted = this._array.subarray(
            NACL_CONSTANTS.NONCE_LENGTH + this._box.crypto.encryptedHeadroom,
        ) as EncryptedData;
        return [nonce, encrypted];
    }

    public encryptWithRandomNonceAhead(): EncryptedDataWithNonceAhead {
        // Generate cryptographically secure random nonce and encrypt data in-place
        const nonceOrNonceGuard = this._encryptInPlaceWithRandomNonce();
        let nonce;
        if (isNonce(nonceOrNonceGuard)) {
            nonce = nonceOrNonceGuard;
        } else {
            nonce = nonceOrNonceGuard.nonce;
            nonceOrNonceGuard.commit();
        }

        // Move the nonce just ahead of the encrypted data
        const encryptedWithNonceAhead = this._array.subarray(this._box.crypto.encryptedHeadroom);
        encryptedWithNonceAhead.set(nonce);

        // Return view to the concatenation of the nonce and the cipher-text
        return encryptedWithNonceAhead as EncryptedDataWithNonceAhead;
    }

    private _encryptInPlaceWithRandomNonce(): TNonceScope extends NonceUnguardedScope
        ? Nonce
        : INonceGuard {
        // Generate cryptographically secure random nonce

        if (this._box.nonceScope === NONCE_UNGUARDED_SCOPE) {
            const nonce = this._box.crypto.randomBytes(
                this._array.subarray(0, NACL_CONSTANTS.NONCE_LENGTH),
            ) as Nonce;

            // Encrypt data in-place
            this._encrypt(nonce);

            // Done
            return nonce as TNonceScope extends NonceUnguardedScope ? Nonce : INonceGuard;
        }

        assert(
            this._box.nonceService !== undefined,
            'NonceService must be defined since nonceScope is not NonceUnguardedScope',
        );

        const nonceGuard = this._box.nonceService.getRandomNonce(this._box.nonceScope);

        const arrayHeadroom = this._array.subarray(0, NACL_CONSTANTS.NONCE_LENGTH);
        arrayHeadroom.set(nonceGuard.nonce);

        // Encrypt data in-place
        this._encrypt(nonceGuard.nonce);

        // Done
        return nonceGuard as TNonceScope extends NonceUnguardedScope ? Nonce : INonceGuard;
    }

    private _encrypt(nonce: Nonce): void {
        // Ensure we haven't already encrypted
        if (this._plain === undefined) {
            throw new CryptoError('Cannot encrypt, data already encrypted');
        }

        // Encrypt data in-place
        const array = this._array.subarray(NACL_CONSTANTS.NONCE_LENGTH);
        this._box.raw.encrypt(array as RawEncryptedData, array as RawPlainData, nonce);

        // Remove plain-text view
        this._plain = undefined;
    }
}

/**
 * A box is used to encrypt and decrypt data from a secret or precomputed
 * shared key.
 */
export class CryptoBox<
    DCK extends Cookie,
    ECK extends Cookie,
    DSN extends u64,
    ESN extends u64,
    TNonceScope extends NonceScope | NonceUnguardedScope,
> {
    /**
     * Headroom required by the encryptor.
     */
    public readonly encryptorHeadroom: u53;

    public constructor(
        /**
         * The crypto backend used.
         */
        public readonly crypto: CryptoBackend,

        /**
         * The nonce service.
         */
        public readonly nonceService: TNonceScope extends NonceUnguardedScope
            ? undefined
            : INonceService,

        /**
         * The underlying crypto box backend (for raw access).
         */
        public readonly raw: CryptoBoxBackend,

        /**
         * The nonce scope used to ensure uniqueness.
         */
        public readonly nonceScope: TNonceScope,
    ) {
        this.encryptorHeadroom = NACL_CONSTANTS.NONCE_LENGTH + crypto.plainHeadroom;
    }

    /**
     * Create a decryptor with a CSP-like nonce construction. The decryption
     * process will always be done within a sub-array of the provided byte
     * buffer.
     *
     * A sub-array will be allocated from the provided byte buffer and the
     * cipher-text will be copied into the byte buffer sub-array at the
     * correct offset.
     *
     * @param bufferOrToken Byte buffer to be used for decryption procedure.
     * @param cookie The appropriate CSP cookie (i.e. server cookie).
     * @param sn The current CSP sequence number (i.e. server sequence number).
     * @param encrypted Cipher-text bytes.
     */
    public decryptorWithCspNonce(
        bufferOrToken: ByteBuffer | CreateBufferToken,
        cookie: DCK,
        sn: DSN,
        encrypted: EncryptedData,
    ): CryptoBoxDecryptor<DCK, DSN, TNonceScope> {
        // Allocate space for the decryption
        const arrayLength = this.crypto.encryptedHeadroom + encrypted.byteLength;
        let nonce: Nonce;
        let array: Uint8Array;
        if (bufferOrToken === CREATE_BUFFER_TOKEN) {
            nonce = new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH) as Nonce;
            array = new Uint8Array(arrayLength);
        } else {
            const buffer = bufferOrToken;
            nonce = buffer.bytes(NACL_CONSTANTS.NONCE_LENGTH) as Nonce;
            array = buffer.bytes(arrayLength);
        }

        // Set CSP-like nonce
        nonce.set(cookie);
        byteView(DataView, nonce).setBigUint64(16, sn, true);

        // Copy the cipher-text data
        array.set(encrypted, this.crypto.encryptedHeadroom);
        return new CryptoBoxDecryptor(this, array, nonce);
    }

    /**
     * Create a decryptor with an external nonce. The decryption process will
     * always be done within a sub-array of the provided byte buffer.
     *
     * A sub-array will be allocated from the provided byte buffer and the
     * cipher-text will be copied into the byte buffer sub-array at the
     * correct offset.
     *
     * Note: The nonce will not be copied, so the caller needs to ensure that
     *       it remains unchanged until the decryption process has been
     *       completed.
     *
     * @param bufferOrToken Byte buffer to be used for decryption procedure.
     * @param nonce Nonce to be used for decryption.
     * @param encrypted Cipher-text bytes.
     */
    public decryptorWithNonce(
        bufferOrToken: ByteBuffer | CreateBufferToken,
        nonce: Nonce,
        encrypted: EncryptedData,
    ): CryptoBoxDecryptor<DCK, DSN, TNonceScope> {
        // Allocate space for the decryption and copy the cipher-text data
        const length = this.crypto.encryptedHeadroom + encrypted.byteLength;
        const array =
            bufferOrToken === CREATE_BUFFER_TOKEN
                ? new Uint8Array(length)
                : bufferOrToken.bytes(length);
        array.set(encrypted, this.crypto.encryptedHeadroom);
        return new CryptoBoxDecryptor(this, array, nonce);
    }

    /**
     * Create a decryptor with a nonce placed ahead of the cipher-text. The
     * decryption process will always be done within a sub-array of the
     * provided byte buffer.
     *
     * A sub-array will be allocated from the provided byte buffer and the
     * cipher-text will be copied into the byte buffer sub-array at the
     * correct offset.
     *
     * Note: The nonce will not be copied, so the caller needs to ensure that
     *       it remains unchanged until the decryption process has been
     *       completed.
     *
     * @param bufferOrToken Byte buffer to be used for decryption procedure.
     * @param encryptedWithNonceAhead Nonce, followed by cipher-text bytes.
     */
    public decryptorWithNonceAhead(
        bufferOrToken: ByteBuffer | CreateBufferToken,
        encryptedWithNonceAhead: EncryptedDataWithNonceAhead,
    ): CryptoBoxDecryptor<DCK, DSN, TNonceScope> {
        // Create a view into the nonce which is ahead of the cipher-text data
        const nonce = encryptedWithNonceAhead.subarray(0, NACL_CONSTANTS.NONCE_LENGTH) as Nonce;

        // Allocate space for the decryption and copy the cipher-text data
        const encrypted = encryptedWithNonceAhead.subarray(NACL_CONSTANTS.NONCE_LENGTH);
        return this.decryptorWithNonce(bufferOrToken, nonce, encrypted as EncryptedData);
    }

    /**
     * Create an encryptor. The encryption process will always be done within
     * a sub-array of the provided byte buffer.
     *
     * When providing an encoder, a sub-array will be allocated from the
     * provided byte buffer and the encoder will be called within that buffer.
     * The encoder needs to copy the plain-text data into the provided buffer
     * and return the sub-array portion it has consumed.
     *
     * When providing an array, the required amount of bytes will be allocated
     * from the provided byte buffer and the plain-text will be copied into the
     * byte buffer sub-array at the correct offset.
     *
     * @param bufferOrToken Byte buffer to be used for encryption procedure.
     * @param encoderOrPlain A plain-text encoder or plain-text bytes to be
     *   copied.
     */
    public encryptor<T extends PlainData | ByteEncoder | ByteLengthEncoder>(
        bufferOrToken:
            | ByteBuffer
            | (T extends PlainData | ByteLengthEncoder ? CreateBufferToken : never),
        encoderOrPlain: T,
    ): CryptoBoxEncryptor<ECK, ESN, TNonceScope> {
        const buffer: ByteBuffer | undefined =
            bufferOrToken instanceof ByteBuffer ? bufferOrToken : undefined;
        const headroom = this.encryptorHeadroom;

        // Allocate space for the encryption
        let array: Uint8Array;
        if (encoderOrPlain instanceof Uint8Array) {
            // Copy the plain-text data
            const plain = encoderOrPlain;
            const length = headroom + plain.byteLength;
            array = buffer?.bytes(length) ?? new Uint8Array(length);
            array.set(plain, headroom);
        } else if (buffer === undefined) {
            // Run the byte length encoder onto a new array
            const encoder = encoderOrPlain as ByteLengthEncoder;
            array = new Uint8Array(headroom + encoder.byteLength());
            encoder.encode(array.subarray(headroom));
        } else {
            const encoder = encoderOrPlain as ByteEncoder;
            array = buffer.with((inner) => {
                // Run the encoder and retrieve the total amount of bytes
                // encoded.
                const plain = encoder(inner.subarray(headroom));

                // Return the array for the encryptor
                return inner.subarray(0, headroom + plain.byteLength);
            });
        }
        return new CryptoBoxEncryptor(this, array);
    }
}

/**
 * Consumes a secret key for public-key cryptography. Doesn't allow direct access to the secret key
 * by the public API.
 */
export class SharedBoxFactory<
    TBox extends CryptoBox<Cookie, Cookie, u64, u64, NonceScope | NonceUnguardedScope>,
> {
    /**
     * Get the derived public part of the secret key.
     */
    public readonly public: PublicKey;

    readonly #_secret: ReadonlyRawKey<32>;

    public constructor(
        private readonly _crypto: CryptoBackend,
        secret: ReadonlyRawKey<32>,
    ) {
        // Store secret key
        this.#_secret = secret;

        // Derive the public key
        this.public = _crypto.derivePublicKey(secret);
    }

    /**
     * Get a crypto box that uses the derived secret of this secret key and
     * the given public key.
     *
     * @param publicKey Given public key to derive a secret from.
     * @param nonceScope Optional nonce scope to prevent nonce reuse.
     * @returns A crypto box for encryption/decryption.
     */
    public getSharedBox(
        publicKey: PublicKey,
        nonceScope: TBox['nonceScope'],
        nonceService: TBox['nonceScope'] extends NonceUnguardedScope ? undefined : INonceService,
    ): TBox {
        return this._crypto.getSharedBox(
            publicKey,
            this.#_secret,
            nonceScope,
            nonceService,
        ) as TBox;
    }
}

/**
 * Wraps a non-ephemeral secret key for public-key cryptography, and obfuscates it in memory. The
 * public API does not allow direct access to the secret key and only allows to generate the
 * corresponding shared boxes.
 *
 * IMPORTANT: After constructing an instance of this class, the `secret` key passed in will have
 *            been purged and should not be used anymore.
 */
export class SecureSharedBoxFactory<
    TBox extends CryptoBox<Cookie, Cookie, u64, u64, NonceScope | NonceUnguardedScope>,
> {
    /**
     * Get the derived public part of the secret key.
     */
    public readonly public: PublicKey;

    readonly #_makeSharedSecret: (publicKey: PublicKey) => RawKey<32>;
    readonly #_makeSharedBox: (publicKey: PublicKey) => TBox;

    private constructor(
        crypto: CryptoBackend,
        nonceService: INonceService,
        nonceScope: NonceScope,
        secret: RawKey<32>,
    ) {
        // Derive the public key
        this.public = crypto.derivePublicKey(secret.asReadonly());

        // Encrypt the secret key with a random key and nonce, then purge the
        // plain form.
        const box = crypto.getSecretBox(
            wrapRawKey(
                crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                NACL_CONSTANTS.KEY_LENGTH,
            ).asReadonly(),
            NONCE_UNGUARDED_SCOPE,
            undefined,
        );
        const encryptedKey = box
            .encryptor(CREATE_BUFFER_TOKEN, secret.unwrap() as PlainData)
            .encryptWithRandomNonceAhead();
        secret.purge();

        // Create an executor function that temporary yields the secret key
        // and purges it after return.
        const decryptBuffer = new ByteBuffer(
            new Uint8Array(crypto.encryptedHeadroom + encryptedKey.byteLength),
        );

        // Declare protected operations for use with the key
        function runWithKey<TResult>(executor: (key: RawKey<32>) => TResult): TResult {
            const decryptedKey = wrapRawKey(
                box.decryptorWithNonceAhead(decryptBuffer, encryptedKey).decrypt().plainData,
                NACL_CONSTANTS.KEY_LENGTH,
            );
            const result = executor(decryptedKey);
            decryptedKey.purge();
            decryptBuffer.reset();
            return result;
        }
        this.#_makeSharedSecret = (publicKey) =>
            runWithKey((secretKey) => crypto.getSharedKey(publicKey, secretKey.asReadonly()));
        this.#_makeSharedBox = (publicKey) =>
            runWithKey((secretKey) =>
                crypto.getSharedBox(publicKey, secretKey.asReadonly(), nonceScope, nonceService),
            ) as TBox;
    }

    /**
     * Wrap and consume a non-ephemeral {@link RawKey} into a {@link SecureSharedBoxFactory}.
     *
     * IMPORTANT: After wrapping, the key will have been purged and cannot be used anymore.
     */
    public static consume<
        TBox extends CryptoBox<Cookie, Cookie, u64, u64, TNonceScope>,
        TNonceScope extends NonceScope,
    >(
        crypto: CryptoBackend,
        nonceService: INonceService,
        nonceScope: TNonceScope,
        secret: RawKey<32>,
    ): SecureSharedBoxFactory<TBox> {
        return new SecureSharedBoxFactory(crypto, nonceService, nonceScope, secret);
    }

    /**
     * Get the shared key (secret).
     *
     * IMPORTANT: Can you use {@link getSharedBox} or {@link deriveSharedKey} instead? Do not use
     *            this method unless you absolutely need to!
     */
    public getSharedSecret(publicKey: PublicKey): RawKey<32> {
        return this.#_makeSharedSecret(publicKey);
    }

    /**
     * Derive a subkey from the shared key with the provided Blake2b parameters.
     */
    public deriveSharedKey<TDerivedKeyLength extends Blake2bKeyLength>(
        length: TDerivedKeyLength,
        publicKey: PublicKey,
        parameters: Blake2bParameters,
    ): RawKey<TDerivedKeyLength> {
        const sharedKey = this.#_makeSharedSecret(publicKey);
        const derivedKey = deriveKey(length, sharedKey, parameters);
        sharedKey.purge();
        return derivedKey;
    }

    /**
     * Get a crypto box that uses the derived secret of this secret key and
     * the given public key.
     *
     * @param publicKey Given public key to derive a secret from.
     * @param nonceScope Optional nonce scope to prevent nonce reuse.
     * @returns A crypto box for encryption/decryption.
     */
    public getSharedBox(publicKey: PublicKey): TBox {
        return this.#_makeSharedBox(publicKey);
    }
}
