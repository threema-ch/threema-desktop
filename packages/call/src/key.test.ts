import {CryptoError, type CryptoBackend} from '@threema/crypto';
import {ensureIdentityString} from '@threema/domain';
import {bytesToHex} from '@threema/ts-utils/byte/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/byte/hex-to-bytes';
import {describe, expect, it} from 'vitest';

import {deriveGroupCallId} from './call-id.js';
import {
    deriveGroupCallKeys,
    ensureRawGroupCallKeyHash,
    GROUP_CALL_KEY_LENGTH,
    wrapRawGroupCallKey,
} from './key.js';

/**
 * Known-answer test vectors for all derivations of a group call, independently derived from the
 * group call protocol:
 *
 *     GCID = Blake2b(key=<none>, salt='i', personal='3ma-call',
 *                    input=<creator-identity> || u64-le(<group-id>) || u8(<version>) || GCK
 *                          || <sfu-base-url>)
 *     GCKH = Blake2b(key=GCK, salt='#', personal='3ma-call')
 *     GCHK = Blake2b(key=GCK, salt='h', personal='3ma-call')
 *     GCSK = Blake2b(key=GCK, salt='s', personal='3ma-call')
 *
 * IMPORTANT: These are the values the single combined derivation entry point produced before it was
 * split into {@link deriveGroupCallKeys} and {@link deriveGroupCallId}. They must not change.
 */
const VECTORS = {
    group: {
        creatorIdentity: ensureIdentityString('ECHOECHO'),
        groupId: 0x0123456789abcdefn,
        protocolVersion: 1,
        sfuBaseUrl: 'https://sfu.threema.test',
    },
    gck: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    callId: '364140e2de50a5e828bc7102264f4d147a5ab855fd729dadc5b8facbcbe6e125',
    gckh: '84a66c9a082dd3802cf0253f2d7e61d016b37ff0931a52fba684a4eb3d2e53c6',
    gchk: '55e0585ab5db5e63996d565d3faaf078c3aaa130f42a91f66a9f24ca9e862ca0',
    gcsk: '4d8b267be0441813cebe7203fa507cf00867278f6cfc3c8270af4dab19cc2011',
} as const;

/**
 * A crypto backend that records the secret keys it is asked to create boxes from, so that the
 * derived key material can be compared against the known-answer vectors.
 */
function recordingCrypto(): {
    readonly crypto: Pick<CryptoBackend, 'getSecretBox'>;
    readonly keys: string[];
} {
    const keys: string[] = [];
    return {
        keys,
        crypto: {
            getSecretBox: (secretKey) => {
                keys.push(bytesToHex(secretKey.unwrap()));

                // Note: The derivation only hands the box out, so it does not need to be usable.
                return {} as never;
            },
        },
    };
}

describe('wrapRawGroupCallKey', () => {
    it('wraps a 32-byte key which unwraps to the same bytes', () => {
        // Arrange
        const bytes = hexToBytes(VECTORS.gck);

        // Act
        const gck = wrapRawGroupCallKey(bytes);

        // Assert
        expect(gck.length).toBe(GROUP_CALL_KEY_LENGTH);
        expect(bytesToHex(gck.unwrap())).toBe(VECTORS.gck);
    });

    it('throws a CryptoError if the key is not 32 bytes long', () => {
        // Assert
        expect(() => wrapRawGroupCallKey(new Uint8Array(31))).toThrow(CryptoError);
        expect(() => wrapRawGroupCallKey(new Uint8Array(33))).toThrow(CryptoError);
    });
});

describe('ensureRawGroupCallKeyHash', () => {
    it('accepts 32 bytes', () => {
        // Arrange
        const bytes = hexToBytes(VECTORS.gckh);

        // Assert
        expect(ensureRawGroupCallKeyHash(bytes)).toBe(bytes);
    });

    it('rejects a value that is not a byte array', () => {
        // Assert
        expect(() => ensureRawGroupCallKeyHash('nope')).toThrow("Expected GCKH, got 'string'");
        expect(() => ensureRawGroupCallKeyHash(undefined)).toThrow(
            "Expected GCKH, got 'undefined'",
        );
    });

    it('rejects a byte array of the wrong length', () => {
        // Assert
        expect(() => ensureRawGroupCallKeyHash(new Uint8Array(31))).toThrow(
            'Array of length 31 is not a valid GCKH',
        );
    });
});

describe('deriveGroupCallKeys', () => {
    it('derives the GCKH, the GCHK and the GCSK from the GCK', () => {
        // Arrange
        const {crypto, keys} = recordingCrypto();
        const gck = wrapRawGroupCallKey(hexToBytes(VECTORS.gck));

        // Act
        const derivations = deriveGroupCallKeys(crypto, gck);

        // Assert: The GCKH is a hash, the GCHK and the GCSK are the keys the boxes were made from.
        expect(bytesToHex(derivations.gckh)).toBe(VECTORS.gckh);
        expect(keys).toStrictEqual([VECTORS.gchk, VECTORS.gcsk]);
    });

    it('derives distinct key material for a distinct GCK', () => {
        // Arrange
        const {crypto, keys} = recordingCrypto();
        const gck = wrapRawGroupCallKey(new Uint8Array(GROUP_CALL_KEY_LENGTH).fill(0xff));

        // Act
        const derivations = deriveGroupCallKeys(crypto, gck);

        // Assert
        expect(bytesToHex(derivations.gckh)).not.toBe(VECTORS.gckh);
        expect(keys).not.toContain(VECTORS.gchk);
        expect(keys).not.toContain(VECTORS.gcsk);
    });
});

describe('the split of the combined group call derivation', () => {
    it('composes to exactly the derivations the combined entry point produced', () => {
        // Arrange
        const {crypto, keys} = recordingCrypto();
        const gck = wrapRawGroupCallKey(hexToBytes(VECTORS.gck));

        // Act: Compose the two split derivations the way the retained entry point does.
        const derivations = {
            callId: deriveGroupCallId({...VECTORS.group, gck}),
            ...deriveGroupCallKeys(crypto, gck),
        };

        // Assert
        expect(derivations.callId.id).toBe(VECTORS.callId);
        expect(bytesToHex(derivations.gckh)).toBe(VECTORS.gckh);
        expect(keys).toStrictEqual([VECTORS.gchk, VECTORS.gcsk]);
    });
});
