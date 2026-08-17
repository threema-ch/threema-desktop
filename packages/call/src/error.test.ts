import {describe, expect, it} from 'vitest';

import {GroupCallError, type GroupCallErrorType} from './error.js';

describe('GroupCallError', () => {
    it('is an error', () => {
        // Arrange
        const error = new GroupCallError({kind: 'invalid-state'}, 'Nope!');

        // Assert
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('GroupCallError');
        expect(error.message).toBe('Nope!');
    });

    it('discriminates the error kind', () => {
        // Arrange
        const errors = [
            new GroupCallError({kind: 'invalid-state'}, 'Invalid state'),
            new GroupCallError({kind: 'directory-error', type: 'fetch'}, 'Directory error'),
            new GroupCallError({kind: 'sfu-timeout'}, 'SFU timeout'),
            new GroupCallError({kind: 'sfu-fetch'}, 'SFU fetch'),
            new GroupCallError({kind: 'sfu-status-code', status: 503}, 'SFU status code'),
            new GroupCallError({kind: 'sfu-invalid-data'}, 'SFU invalid data'),
            new GroupCallError({kind: 'webrtc-connect'}, 'WebRTC connect'),
        ];

        // Act: Narrow each error kind, which only type checks if the union discriminates.
        const described = errors.map((error) => {
            const type: GroupCallErrorType = error.type;
            switch (type.kind) {
                case 'directory-error':
                    return `${type.kind}: ${type.type}`;
                case 'sfu-status-code':
                    return `${type.kind}: ${type.status}`;
                default:
                    return type.kind;
            }
        });

        // Assert
        expect(described).toStrictEqual([
            'invalid-state',
            'directory-error: fetch',
            'sfu-timeout',
            'sfu-fetch',
            'sfu-status-code: 503',
            'sfu-invalid-data',
            'webrtc-connect',
        ]);
    });

    it('propagates a caught error as the cause', () => {
        // Arrange
        const cause = new Error('Connection reset');

        // Act
        let error;
        try {
            throw cause;
        } catch (caught: unknown) {
            error = new GroupCallError({kind: 'sfu-fetch'}, 'Peeking failed', {from: caught});
        }

        // Assert
        expect(error.cause).toBe(cause);
    });

    it('maps a caught non-error cause to an error', () => {
        // Act
        let error;
        try {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw 'Connection reset';
        } catch (caught: unknown) {
            error = new GroupCallError({kind: 'sfu-fetch'}, 'Peeking failed', {from: caught});
        }

        // Assert
        expect(error.cause).toBeInstanceOf(Error);
        expect((error.cause as Error).message).toBe('Connection reset');
    });

    it('has no cause when none was provided', () => {
        // Assert
        expect(new GroupCallError({kind: 'sfu-timeout'}, 'Too slow').cause).toBeUndefined();
        expect(
            new GroupCallError({kind: 'sfu-timeout'}, 'Too slow', {from: undefined}).cause,
        ).toBeUndefined();
    });
});
