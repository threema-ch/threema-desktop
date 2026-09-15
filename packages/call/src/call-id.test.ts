import {ensureIdentityString} from '@threema/domain';
import {bytesToHex} from '@threema/ts-utils/byte/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/byte/hex-to-bytes';
import {describe, expect, it} from 'vitest';

import {createGroupCallId, deriveGroupCallId, type GroupCallIdProperties} from './call-id.js';
import {wrapRawGroupCallKey} from './key.js';

/**
 * The properties and the expected Group Call ID of the known-answer vector, see `key.test.ts`.
 */
const VECTOR = {
    properties: {
        creatorIdentity: ensureIdentityString('ECHOECHO'),
        groupId: 0x0123456789abcdefn,
        protocolVersion: 1,
        gck: wrapRawGroupCallKey(
            hexToBytes('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'),
        ),
        sfuBaseUrl: 'https://sfu.threema.test',
    },
    callId: '364140e2de50a5e828bc7102264f4d147a5ab855fd729dadc5b8facbcbe6e125',
} as const satisfies {readonly properties: GroupCallIdProperties; readonly callId: string};

describe('createGroupCallId', () => {
    it('exposes the bytes, the hex value and a shortened value', () => {
        // Arrange
        const bytes = hexToBytes(VECTOR.callId);

        // Act
        const callId = createGroupCallId(bytes);

        // Assert
        expect(callId.bytes).toBe(bytes);
        expect(callId.id).toBe(VECTOR.callId);
        expect(callId.shortened).toBe('3641..e125');
    });

    it('rejects a value that is not 32 bytes long', () => {
        // Assert
        expect(() => createGroupCallId(new Uint8Array(31))).toThrow('Not a valid group call id');
        expect(() => createGroupCallId(new Uint8Array(33))).toThrow('Not a valid group call id');
    });

    it('rejects an all-zero value', () => {
        // Assert
        expect(() => createGroupCallId(new Uint8Array(32))).toThrow('Not a valid group call id');
    });
});

describe('deriveGroupCallId', () => {
    it('derives the Group Call ID from the group and the call properties', () => {
        // Act
        const callId = deriveGroupCallId(VECTOR.properties);

        // Assert
        expect(callId.id).toBe(VECTOR.callId);
        expect(bytesToHex(callId.bytes)).toBe(VECTOR.callId);
    });

    it.each([
        {creatorIdentity: ensureIdentityString('ECHOECH1')},
        {groupId: 0x0123456789abcdeen},
        {protocolVersion: 2},
        {sfuBaseUrl: 'https://sfu.threema.test/'},
    ])('derives a distinct Group Call ID when %o changes', (change) => {
        // Act
        const callId = deriveGroupCallId({...VECTOR.properties, ...change});

        // Assert
        expect(callId.id).not.toBe(VECTOR.callId);
    });

    it('rejects a protocol version that does not fit into a byte', () => {
        // Assert
        expect(() => deriveGroupCallId({...VECTOR.properties, protocolVersion: 256})).toThrow();
    });
});
