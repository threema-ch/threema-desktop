import {describe, expect, it} from 'vitest';

import {ensureMediaDeviceId, isMediaDeviceId} from './media-device-id';

describe('isMediaDeviceId', () => {
    it('accepts an identifier the platform reported', () => {
        // Arrange, Act & Assert
        expect(isMediaDeviceId('7f3c1e')).toBe(true);
    });

    it('rejects an identifier the platform withheld', () => {
        // Arrange, Act & Assert
        expect(isMediaDeviceId('')).toBe(false);
    });
});

describe('ensureMediaDeviceId', () => {
    it('returns an identifier the platform reported', () => {
        // Arrange, Act & Assert
        expect(ensureMediaDeviceId('7f3c1e')).toBe('7f3c1e');
    });

    it('throws for an identifier the platform withheld', () => {
        // Arrange, Act & Assert
        expect(() => ensureMediaDeviceId('')).toThrow('the identifier is empty');
    });
});
