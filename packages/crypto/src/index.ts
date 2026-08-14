// Shared, platform-neutral collection of generic crypto primitives.
// This package contains no DOM, Node, or Electron APIs — only plain TypeScript.

export {
    blake2bHash,
    type Blake2bHasher,
    type Blake2bHashLength,
    type Blake2bKeyLength,
    type Blake2bParameters,
} from './blake2b/blake2b.js';

export {
    CREATE_BUFFER_TOKEN,
    type CreateBufferToken,
    CryptoBox,
    CryptoBoxDecryptor,
    CryptoBoxEncryptor,
    SecureSharedBoxFactory,
    type SecureSharedBoxFactoryOptions,
    SharedBoxFactory,
} from './box.js';

export {
    type CryptoBackend,
    type CryptoBoxBackend,
    NONCE_UNGUARDED_SCOPE,
    type NonceUnguardedScope,
} from './backend.js';

export {CryptoError} from './error.js';

export {
    type Blake2bKdfParameters,
    deriveKey,
    isReadonlyRawKey,
    type RawKey,
    type ReadonlyRawKey,
    type SecretKeyLength,
    type UnwrappedRawKey,
    wrapRawKey,
} from './key.js';

export {type INonceGuard, type INonceService, NONCE_REUSED, type NonceReused} from './nonce.js';

export {
    COOKIE_LENGTH,
    type Cookie,
    type Ed25519PublicKey,
    type Ed25519Signature,
    type EncryptedData,
    type EncryptedDataWithNonceAhead,
    ensureCookie,
    ensureEd25519PublicKey,
    ensureEd25519Signature,
    ensureEncryptedDataWithNonceAhead,
    ensureNonce,
    ensureNonceHash,
    ensurePublicKey,
    isCookie,
    isEd25519PublicKey,
    isEd25519Signature,
    isNonce,
    isNonceHash,
    isPublicKey,
    NACL_CONSTANTS,
    type Nonce,
    type NonceHash,
    type PlainData,
    type PublicKey,
    type RawEncryptedData,
    type RawPlainData,
    type SignatureLength,
} from './primitives.js';
