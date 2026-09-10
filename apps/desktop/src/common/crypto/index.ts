// Note: The crypto box and the primitives it is built on live in `@threema/crypto` so that they can
// be shared with other apps. They are re-exported here to keep the existing import sites working.
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports
export type {CryptoBox} from '@threema/crypto';

export {
    COOKIE_LENGTH,
    ensureCookie,
    ensureEd25519PublicKey,
    ensureEd25519Signature,
    ensureEncryptedDataWithNonceAhead,
    ensureNonce,
    ensureNonceHash,
    ensurePublicKey,
    isNonce,
    isNonceHash,
    isPublicKey,
    NACL_CONSTANTS,
    NONCE_UNGUARDED_SCOPE,
} from '@threema/crypto';

export type {
    Cookie,
    CryptoBackend,
    Ed25519PublicKey,
    EncryptedData,
    EncryptedDataWithNonceAhead,
    Nonce,
    NonceHash,
    NonceUnguardedScope,
    PlainData,
    PublicKey,
} from '@threema/crypto';
