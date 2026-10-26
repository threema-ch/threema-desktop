import Long from 'long';
import {describe, expect, it} from 'vitest';

import {unsignedLongAsU64} from './unsigned-long-as-u64.js';

describe('unsignedLongAsU64', () => {
    const schema = unsignedLongAsU64();

    it('converts an unsigned Long into a u64', () => {
        // Act
        const result = schema.parse(Long.fromNumber(4294967297, true));

        // Assert
        expect(result).toBe(4294967297n);
    });

    it('converts a signed zero Long into an unsigned zero u64', () => {
        // Arrange
        const value = Long.fromNumber(0, false);

        // Act
        const result = schema.parse(value);

        // Assert
        expect(result).toBe(0n);
    });

    it('rejects a signed non-zero Long', () => {
        // Act / Assert
        expect(() => schema.parse(Long.fromNumber(20, false))).toThrow(
            'Long value is not unsigned',
        );
    });

    it('rejects a value that is not a Long', () => {
        // Act / Assert
        expect(() => schema.parse(42)).toThrow(
            'Expected a Long value, but "Long.isLong" returns false for value "42" with type "number"',
        );
    });
});
