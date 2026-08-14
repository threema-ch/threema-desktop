import {describe, expect, it} from 'vitest';

import {
    COOKIE_LENGTH,
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
} from './primitives.js';

/** Create a byte array of `length` filled with a recognisable pattern. */
function bytes(length: number): Uint8Array {
    return new Uint8Array(length).fill(0x42);
}

describe('NACL_CONSTANTS', () => {
    it('matches the NaCl secretbox/box parameters', () => {
        // Assert
        expect(NACL_CONSTANTS.KEY_LENGTH).toBe(32);
        expect(NACL_CONSTANTS.NONCE_LENGTH).toBe(24);
        expect(NACL_CONSTANTS.MAC_LENGTH).toBe(16);
        expect(NACL_CONSTANTS.SIGNATURE_LENGTH).toBe(64);
    });

    it('declares the cookie length as half of a nonce, rounded down to 16', () => {
        // Assert
        expect(COOKIE_LENGTH).toBe(16);
    });
});

describe('isPublicKey', () => {
    it('accepts exactly 32 bytes', () => {
        // Act & assert
        expect(isPublicKey(bytes(32))).toBe(true);
    });

    it('rejects a byte array of the wrong length', () => {
        // Act & assert
        expect(isPublicKey(bytes(31))).toBe(false);
        expect(isPublicKey(bytes(33))).toBe(false);
    });

    it('rejects a value that is not a byte array', () => {
        // Act & assert
        expect(isPublicKey('not bytes')).toBe(false);
    });
});

describe('ensurePublicKey', () => {
    it('returns the key when it is 32 bytes long', () => {
        // Arrange
        const key = bytes(32);

        // Act & assert
        expect(ensurePublicKey(key)).toBe(key);
    });

    it('throws with both lengths mentioned when the length is wrong', () => {
        // Act & assert
        expect(() => ensurePublicKey(bytes(16))).toThrow(
            'Expected public key to be 32 bytes but has 16 bytes',
        );
    });
});

describe('isNonce', () => {
    it('accepts exactly 24 bytes', () => {
        // Act & assert
        expect(isNonce(bytes(24))).toBe(true);
    });

    it('rejects a byte array of the wrong length', () => {
        // Act & assert
        expect(isNonce(bytes(23))).toBe(false);
    });

    it('rejects a value that is not a byte array', () => {
        // Act & assert
        expect(isNonce(undefined)).toBe(false);
    });
});

describe('ensureNonce', () => {
    it('returns the nonce when it is 24 bytes long', () => {
        // Arrange
        const nonce = bytes(24);

        // Act & assert
        expect(ensureNonce(nonce)).toBe(nonce);
    });

    it('throws when the length is wrong', () => {
        // Act & assert
        expect(() => ensureNonce(bytes(8))).toThrow('Array of length 8 is not a valid nonce');
    });
});

describe('isNonceHash', () => {
    it('accepts exactly 32 bytes', () => {
        // Act & assert
        expect(isNonceHash(bytes(32))).toBe(true);
    });

    it('rejects a byte array of the wrong length', () => {
        // Act & assert
        expect(isNonceHash(bytes(31))).toBe(false);
    });

    it('rejects a value that is not a byte array', () => {
        // Act & assert
        expect(isNonceHash(42)).toBe(false);
    });
});

describe('ensureNonceHash', () => {
    it('returns the hash when it is 32 bytes long', () => {
        // Arrange
        const hash = bytes(32);

        // Act & assert
        expect(ensureNonceHash(hash)).toBe(hash);
    });

    it('throws when the length is wrong', () => {
        // Act & assert
        expect(() => ensureNonceHash(bytes(4))).toThrow(
            'Array of length 4 is not a valid nonce hash',
        );
    });
});

describe('isEd25519PublicKey', () => {
    it('accepts exactly 32 bytes', () => {
        // Act & assert
        expect(isEd25519PublicKey(bytes(32))).toBe(true);
    });

    it('rejects a byte array of the wrong length', () => {
        // Act & assert
        expect(isEd25519PublicKey(bytes(64))).toBe(false);
    });

    it('rejects a value that is not a byte array', () => {
        // Act & assert
        expect(isEd25519PublicKey(null)).toBe(false);
    });
});

describe('ensureEd25519PublicKey', () => {
    it('returns the key when it is 32 bytes long', () => {
        // Arrange
        const key = bytes(32);

        // Act & assert
        expect(ensureEd25519PublicKey(key)).toBe(key);
    });

    it('throws when the length is wrong', () => {
        // Act & assert
        expect(() => ensureEd25519PublicKey(bytes(1))).toThrow(
            'Expected Ed25519 public key to be 32 bytes but has 1 bytes',
        );
    });
});

describe('isEd25519Signature', () => {
    it('accepts exactly 64 bytes', () => {
        // Act & assert
        expect(isEd25519Signature(bytes(64))).toBe(true);
    });

    it('rejects a byte array of the wrong length', () => {
        // Act & assert
        expect(isEd25519Signature(bytes(32))).toBe(false);
    });

    it('rejects a value that is not a byte array', () => {
        // Act & assert
        expect(isEd25519Signature({})).toBe(false);
    });
});

describe('ensureEd25519Signature', () => {
    it('returns the signature when it is 64 bytes long', () => {
        // Arrange
        const signature = bytes(64);

        // Act & assert
        expect(ensureEd25519Signature(signature)).toBe(signature);
    });

    it('throws when the length is wrong', () => {
        // Act & assert
        expect(() => ensureEd25519Signature(bytes(63))).toThrow(
            'Expected Ed25519 signature to be 64 bytes but has 63 bytes',
        );
    });
});

describe('isCookie', () => {
    it('accepts exactly 16 bytes', () => {
        // Act & assert
        expect(isCookie(bytes(16))).toBe(true);
    });

    it('rejects a byte array of the wrong length', () => {
        // Act & assert
        expect(isCookie(bytes(24))).toBe(false);
    });

    it('rejects a value that is not a byte array', () => {
        // Act & assert
        expect(isCookie(false)).toBe(false);
    });
});

describe('ensureCookie', () => {
    it('returns the cookie when it is 16 bytes long', () => {
        // Arrange
        const cookie = bytes(16);

        // Act & assert
        expect(ensureCookie(cookie)).toBe(cookie);
    });

    it('throws when the length is wrong', () => {
        // Act & assert
        expect(() => ensureCookie(bytes(15))).toThrow(
            'Expected cookie to be 16 bytes but has 15 bytes',
        );
    });
});

describe('ensureEncryptedDataWithNonceAhead', () => {
    it('accepts the minimum length of a nonce plus a MAC', () => {
        // Arrange
        const data = bytes(NACL_CONSTANTS.NONCE_LENGTH + NACL_CONSTANTS.MAC_LENGTH);

        // Act & assert
        expect(ensureEncryptedDataWithNonceAhead(data)).toBe(data);
    });

    it('accepts anything longer than the minimum length', () => {
        // Arrange
        const data = bytes(NACL_CONSTANTS.NONCE_LENGTH + NACL_CONSTANTS.MAC_LENGTH + 1);

        // Act & assert
        expect(ensureEncryptedDataWithNonceAhead(data)).toBe(data);
    });

    it('throws when the data cannot hold a nonce and a MAC', () => {
        // Act & assert
        expect(() => ensureEncryptedDataWithNonceAhead(bytes(39))).toThrow(
            'Expected encrypted data to be at least 40 bytes but has 39 bytes',
        );
    });
});
