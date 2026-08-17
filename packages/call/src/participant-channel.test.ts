import {
    deriveKey,
    ensurePublicKey,
    NACL_CONSTANTS,
    NONCE_UNGUARDED_SCOPE,
    wrapRawKey,
    type Blake2bKdfParameters,
    type Blake2bKeyLength,
    type CryptoBackend,
    type PublicKey,
    type RawKey,
    type SecureSharedBoxFactory,
} from '@threema/crypto';
import {bytesToHex} from '@threema/ts-utils/byte/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/byte/hex-to-bytes';
import type {u53} from '@threema/ts-utils/integer/u53';
import {describe, expect, it} from 'vitest';

import {CALL_PERSONAL, ensureRawGroupCallKeyHash, type RawGroupCallKeyHash} from './key.js';
import {
    deriveGroupCallNormalHandshakeAuthKey,
    type SharedKeyDeriver,
} from './participant-channel.js';

/**
 * Known-answer test vector for the Group Call Normal Handshake Authentication key, independently
 * derived from the group call protocol:
 *
 *     GCNHAK = Blake2b(key=<shared-secret>, salt='nha', personal='3ma-call', input=GCKH)
 *
 * Note: The `<shared-secret>` is the X25519 agreement between the local secret key and the remote
 * public key. Computing it is the crypto backend's job, not this package's, so the vector fixes it
 * to a known value and pins what this package is responsible for: the salt, the personalisation and
 * the GCKH being hashed in as input.
 */
const VECTORS = {
    sharedSecret: '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
    gckh: '84a66c9a082dd3802cf0253f2d7e61d016b37ff0931a52fba684a4eb3d2e53c6',
    remotePublicKey: 'a0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebf',
    gcnhak: 'd2785515aee05903d302fb1a4fb12ec4e26df22a2b929c3ff1f4e7e99b5b783b',
} as const;

/**
 * Compile-time assertion that a {@link SecureSharedBoxFactory} — which is what desktop's Client Key
 * (CK) is — satisfies {@link SharedKeyDeriver} without an adapter or a cast.
 */
export type ClientKeyShapeMustSatisfyTheDeriver =
    SecureSharedBoxFactory<never> extends SharedKeyDeriver ? true : never;

/** What a {@link SharedKeyDeriver} was asked to derive. */
interface RecordedDerivation {
    readonly length: u53;
    readonly publicKey: string;
    readonly parameters: Blake2bKdfParameters;
}

/**
 * Run the derivation under test, recording both what the local secret key was asked to derive and
 * what the crypto backend was asked to create a box from.
 */
function derive(gckh: RawGroupCallKeyHash = ensureRawGroupCallKeyHash(hexToBytes(VECTORS.gckh))): {
    /** The secret keys the boxes were created from, in hex. */
    readonly keys: readonly string[];
    /** The nonce scopes the boxes were created with. */
    readonly nonceScopes: readonly unknown[];
    /** The shared key derivations that were requested. */
    readonly derivations: readonly RecordedDerivation[];
} {
    const keys: string[] = [];
    const nonceScopes: unknown[] = [];
    const derivations: RecordedDerivation[] = [];

    // A crypto backend that records the secret keys it is asked to create boxes from.
    const crypto: Pick<CryptoBackend, 'getSecretBox'> = {
        getSecretBox: (secretKey, nonceScope) => {
            keys.push(bytesToHex(secretKey.unwrap()));
            nonceScopes.push(nonceScope);

            // Note: The derivation only hands the box out, so it does not need to be usable.
            return {} as never;
        },
    };

    // A local secret key whose shared secret with any public key is `VECTORS.sharedSecret`.
    const localSecretKey: SharedKeyDeriver = {
        deriveSharedKey: <TDerivedKeyLength extends Blake2bKeyLength>(
            length: TDerivedKeyLength,
            publicKey: PublicKey,
            parameters: Blake2bKdfParameters,
        ): RawKey<TDerivedKeyLength> => {
            derivations.push({length, publicKey: bytesToHex(publicKey), parameters});

            // Note: This is exactly what `SecureSharedBoxFactory` does with the shared secret, so
            // the derivation under test runs for real — only the X25519 agreement is fixed.
            return deriveKey(
                length,
                wrapRawKey(
                    hexToBytes(VECTORS.sharedSecret),
                    NACL_CONSTANTS.KEY_LENGTH,
                ).asReadonly(),
                parameters,
            );
        },
    };

    deriveGroupCallNormalHandshakeAuthKey(
        crypto,
        localSecretKey,
        gckh,
        ensurePublicKey(hexToBytes(VECTORS.remotePublicKey)),
    );
    return {keys, nonceScopes, derivations};
}

describe('deriveGroupCallNormalHandshakeAuthKey', () => {
    it('derives the GCNHAK from the shared secret and the GCKH', () => {
        // Act
        const {keys} = derive();

        // Assert: The GCNHAK is the key the box was made from.
        expect(keys).toStrictEqual([VECTORS.gcnhak]);
    });

    it('derives a 32-byte subkey from the shared secret with the remote public key', () => {
        // Arrange
        const gckh = ensureRawGroupCallKeyHash(hexToBytes(VECTORS.gckh));

        // Act
        const {derivations} = derive(gckh);

        // Assert
        expect(derivations).toStrictEqual([
            {
                length: NACL_CONSTANTS.KEY_LENGTH,
                publicKey: VECTORS.remotePublicKey,
                parameters: {personal: CALL_PERSONAL, salt: 'nha', input: gckh},
            },
        ]);
    });

    it('creates the box with an unguarded nonce scope, i.e. a random nonce per message', () => {
        // Act
        const {nonceScopes} = derive();

        // Assert
        expect(nonceScopes).toStrictEqual([NONCE_UNGUARDED_SCOPE]);
    });

    it('derives distinct key material for a distinct GCKH', () => {
        // Act
        const {keys} = derive(ensureRawGroupCallKeyHash(new Uint8Array(32).fill(0xff)));

        // Assert
        expect(keys).not.toContain(VECTORS.gcnhak);
    });
});
