import {wrapRawKey, type CryptoBackend} from '@threema/crypto';
import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/conversion/hex-to-bytes';
import type {u8} from '@threema/ts-utils/integer/u8';
import {tag} from '@threema/ts-utils/meta/newtype';
import {describe, expect, it} from 'vitest';

import {
    alignMediaKeyStateWith,
    ensureMediaKeySuccessorState,
    LocalParticipantCallMediaKey,
    PCMK_LENGTH,
    type ParticipantCallMediaKeyState,
    type RawParticipantCallMediaKey,
} from './media-key.js';

/**
 * Known-answer test vectors for the PCMK ratchet, independently derived from the group call
 * protocol:
 *
 *     PCMK' = Blake2b(key=PCMK, salt="m'", personal='3ma-call')
 *
 * The ratchet is applied repeatedly, so `ratchet[n]` is the PCMK after `n` ratchet steps from
 * `pcmk`.
 */
const VECTORS = {
    pcmk: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    ratchet: [
        '2fffa25545d69ccf7144a6d97802023e866a33bf0ecf8e884afc8ed7c5cdfa32',
        '77a4d00e7888beda9d2b7b14485326d59a863d74b264bcfd63c08521066d6aca',
        'bf289467471cd24d50b64d8e66d792607adf5726d74c7f5c2ea6bf6f4d4ca6f5',
    ],
} as const;

/**
 * Create a media key state from a PCMK given in hex, or from arbitrary (irrelevant) key material.
 */
function makeState(
    epoch: u8,
    ratchetCounter: u8,
    pcmk: string = VECTORS.pcmk,
): ParticipantCallMediaKeyState {
    return {
        epoch,
        ratchetCounter,
        pcmk: tag<RawParticipantCallMediaKey>(wrapRawKey(hexToBytes(pcmk), PCMK_LENGTH)),
    };
}

/**
 * A crypto backend whose "random" bytes are a distinct constant per call, so that generated PCMKs
 * are distinguishable from one another while remaining reproducible.
 */
function countingCrypto(): Pick<CryptoBackend, 'randomBytes'> {
    let counter = 0;
    return {
        randomBytes: <T extends ArrayBufferView>(buffer: T): T => {
            counter += 1;
            new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).fill(counter % 256);
            return buffer;
        },
    };
}

describe('alignMediaKeyStateWith', () => {
    it('ratchets the PCMK once when the counter advanced by one', () => {
        // Arrange
        const current = makeState(7, 0);

        // Act
        const aligned = alignMediaKeyStateWith(current, 1);

        // Assert
        expect(aligned.epoch).toBe(7);
        expect(aligned.ratchetCounter).toBe(1);
        expect(bytesToHex(aligned.pcmk.unwrap())).toBe(VECTORS.ratchet[0]);
    });

    it('ratchets repeatedly when the counter jumped ahead', () => {
        // Arrange
        const current = makeState(7, 0);

        // Act
        const aligned = alignMediaKeyStateWith(current, 3);

        // Assert
        expect(aligned.ratchetCounter).toBe(3);
        expect(bytesToHex(aligned.pcmk.unwrap())).toBe(VECTORS.ratchet[2]);
    });

    it('aligns from a non-zero ratchet counter', () => {
        // Arrange: The state is already one ratchet step ahead.
        const current = makeState(0, 1, VECTORS.ratchet[0]);

        // Act
        const aligned = alignMediaKeyStateWith(current, 3);

        // Assert: Ratcheting twice more must land on the very same key.
        expect(bytesToHex(aligned.pcmk.unwrap())).toBe(VECTORS.ratchet[2]);
    });

    it('leaves the source state untouched', () => {
        // Arrange
        const current = makeState(0, 0);

        // Act
        alignMediaKeyStateWith(current, 2);

        // Assert
        expect(current.ratchetCounter).toBe(0);
        expect(bytesToHex(current.pcmk.unwrap())).toBe(VECTORS.pcmk);
    });

    it('rejects aligning with the same ratchet counter', () => {
        // Assert
        expect(() => alignMediaKeyStateWith(makeState(0, 3), 3)).toThrow(
            'Attempted to align with an older ratchet counter',
        );
    });

    it('rejects aligning with an older ratchet counter', () => {
        // Assert
        expect(() => alignMediaKeyStateWith(makeState(0, 3), 2)).toThrow(
            'Attempted to align with an older ratchet counter',
        );
    });
});

describe('ensureMediaKeySuccessorState', () => {
    it('accepts a higher epoch', () => {
        // Arrange
        const successor = makeState(2, 0);

        // Assert
        expect(ensureMediaKeySuccessorState(makeState(1, 9), successor)).toBe(successor);
    });

    it('accepts a higher ratchet counter within the same epoch', () => {
        // Arrange
        const successor = makeState(1, 1);

        // Assert
        expect(ensureMediaKeySuccessorState(makeState(1, 0), successor)).toBe(successor);
    });

    it('accepts the epoch wrapping from 255 to 0', () => {
        // Arrange
        const successor = makeState(0, 0);

        // Assert
        expect(ensureMediaKeySuccessorState(makeState(255, 3), successor)).toBe(successor);
    });

    it('rejects a lower epoch', () => {
        // Assert
        expect(() => ensureMediaKeySuccessorState(makeState(2, 0), makeState(1, 9))).toThrow(
            'Attempted to downgrade epoch or ratchet counter within an epoch',
        );
    });

    it('rejects the same epoch and ratchet counter', () => {
        // Assert
        expect(() => ensureMediaKeySuccessorState(makeState(1, 3), makeState(1, 3))).toThrow(
            'Attempted to downgrade epoch or ratchet counter within an epoch',
        );
    });

    it('rejects a lower ratchet counter within the same epoch', () => {
        // Assert
        expect(() => ensureMediaKeySuccessorState(makeState(1, 3), makeState(1, 2))).toThrow(
            'Attempted to downgrade epoch or ratchet counter within an epoch',
        );
    });

    it('rejects a reset to epoch 0 when the current epoch is not 255', () => {
        // Assert
        expect(() => ensureMediaKeySuccessorState(makeState(3, 0), makeState(0, 0))).toThrow(
            'Attempted to downgrade epoch or ratchet counter within an epoch',
        );
    });
});

describe('LocalParticipantCallMediaKey', () => {
    it('starts at epoch 0 and ratchet counter 0 with a random PCMK', () => {
        // Act
        const key = new LocalParticipantCallMediaKey(countingCrypto());

        // Assert
        expect(key.current.epoch).toBe(0);
        expect(key.current.ratchetCounter).toBe(0);
        expect(key.current.pcmk.unwrap()).toStrictEqual(new Uint8Array(PCMK_LENGTH).fill(1));
        expect(key.pending).toBeUndefined();
        expect(key.all()).toStrictEqual([key.current]);
    });

    it('ratchets the current PCMK forward', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        const initial = key.current.pcmk.unwrap().slice();

        // Act
        const ratcheted = key.nextRatchetCounter();

        // Assert
        expect(ratcheted).toBe(key.current);
        expect(key.current.epoch).toBe(0);
        expect(key.current.ratchetCounter).toBe(1);
        expect(key.current.pcmk.unwrap()).toStrictEqual(
            alignMediaKeyStateWith(makeState(0, 0, bytesToHex(initial)), 1).pcmk.unwrap(),
        );
    });

    it('rejects a ratchet counter overflow', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        for (let counter = 0; counter < 255; counter++) {
            key.nextRatchetCounter();
        }

        // Assert
        expect(key.current.ratchetCounter).toBe(255);
        expect(() => key.nextRatchetCounter()).toThrow('Ratchet counter would overflow');
    });

    it('generates a pending successor with the next epoch that is not applied yet', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        key.nextRatchetCounter();
        const current = key.current;

        // Act
        const pending = key.nextEpoch();

        // Assert: The successor resets the ratchet counter and carries fresh key material...
        expect(pending.stale).toBe(false);
        expect(pending.state.epoch).toBe(1);
        expect(pending.state.ratchetCounter).toBe(0);
        expect(pending.state.pcmk.unwrap()).toStrictEqual(new Uint8Array(PCMK_LENGTH).fill(2));

        // ...but is not applied yet, so both keys are in use.
        expect(key.current).toBe(current);
        expect(key.pending).toBe(pending.state);
        expect(key.all()).toStrictEqual([current, pending.state]);
    });

    it('replaces and purges the current PCMK once the successor is applied', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        const superseded = key.current;
        const pending = key.nextEpoch();

        // Act
        pending.applied();

        // Assert
        expect(key.current).toBe(pending.state);
        expect(key.pending).toBeUndefined();
        expect(key.all()).toStrictEqual([pending.state]);
        expect(superseded.pcmk.purged).toBe(true);
    });

    it('marks the pending successor as stale when another epoch change arrives first', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        const first = key.nextEpoch();

        // Act
        const second = key.nextEpoch();

        // Assert: No second successor is generated; the pending one is marked stale instead.
        expect(second).toBe(first);
        expect(second.stale).toBe(true);
        expect(second.state).toBe(first.state);
        expect(key.pending).toBe(first.state);
    });

    it('rejects applying a successor twice', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        const pending = key.nextEpoch();
        pending.applied();

        // Assert
        expect(() => pending.applied()).toThrow('Assertion failed');
    });

    it('ratchets the current PCMK while a successor is pending', () => {
        // Arrange
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        const pending = key.nextEpoch();

        // Act
        key.nextRatchetCounter();

        // Assert: The ratchet applies to the current PCMK, the pending one is untouched.
        expect(key.current.epoch).toBe(0);
        expect(key.current.ratchetCounter).toBe(1);
        expect(key.pending).toBe(pending.state);
        expect(pending.state.ratchetCounter).toBe(0);
    });

    it('wraps the epoch from 255 to 0', () => {
        // Arrange: Exhaust the epoch range.
        const key = new LocalParticipantCallMediaKey(countingCrypto());
        for (let epoch = 0; epoch < 255; epoch++) {
            key.nextEpoch().applied();
        }
        expect(key.current.epoch).toBe(255);

        // Act
        const pending = key.nextEpoch();

        // Assert
        expect(pending.state.epoch).toBe(0);
    });
});
