import {describe, expect, it} from 'vitest';

import {
    ensureParticipantId,
    getMids,
    isParticipantId,
    MIDS_MAX,
    type ParticipantId,
} from './participant.js';

describe('MIDS_MAX', () => {
    it('is the amount of participants the MID partitions can serve', () => {
        // Assert: 79 one-byte MIDs plus 79² two-byte MIDs, in partitions of 8 MIDs.
        expect(MIDS_MAX).toBe((79 + 79 ** 2) / 8);
        expect(MIDS_MAX).toBe(790);
    });
});

describe('isParticipantId', () => {
    it.each([0, 1, 789])('accepts %i', (value) => {
        // Assert
        expect(isParticipantId(value)).toBe(true);
    });

    it.each([-1, 790, 791])('rejects %i', (value) => {
        // Assert
        expect(isParticipantId(value)).toBe(false);
    });
});

describe('ensureParticipantId', () => {
    it('returns a valid participant id', () => {
        // Assert
        expect(ensureParticipantId(789)).toBe(789);
    });

    it('rejects a participant id beyond the MID partitions', () => {
        // Assert
        expect(() => ensureParticipantId(790)).toThrow("Not a valid participant id: '790'");
    });
});

describe('getMids', () => {
    it.each([
        {
            participantId: 0,
            mids: {microphone: '!', camera: '#', screen: '$', data: '+'},
        },
        {
            participantId: 1,
            mids: {microphone: '-', camera: '.', screen: '0', data: '5'},
        },
        // Note: This partition crosses the boundary from one-byte to two-byte MIDs.
        {
            participantId: 9,
            mids: {microphone: 'x', camera: 'y', screen: 'z', data: '!!'},
        },
        {
            participantId: 789,
            mids: {microphone: '~w', camera: '~x', screen: '~y', data: '~~'},
        },
    ])('maps participant $participantId onto its MID partition', ({participantId, mids}) => {
        // Assert
        expect(getMids(ensureParticipantId(participantId))).toStrictEqual(mids);
    });

    it('maps every participant onto a distinct MID partition', () => {
        // Act
        const microphones = new Set(
            Array.from(
                {length: MIDS_MAX},
                (_, participantId) => getMids(ensureParticipantId(participantId)).microphone,
            ),
        );

        // Assert
        expect(microphones.size).toBe(MIDS_MAX);
    });

    it('throws if no MID partition exists for the participant id', () => {
        // Assert
        expect(() => getMids(MIDS_MAX as ParticipantId)).toThrow(
            "Unable to infer MIDs from participant id '790'",
        );
    });
});
