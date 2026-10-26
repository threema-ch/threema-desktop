import Long from 'long';
import {describe, expect, it} from 'vitest';

import {u64ToUnsignedLong} from './into-unsigned-long.js';

describe('u64ToUnsignedLong', () => {
    it('converts 0n to an unsigned zero Long', () => {
        // Act
        const result = u64ToUnsignedLong(0n);

        // Assert
        expect(result.unsigned).toBe(true);
        expect(result.equals(Long.UZERO)).toBe(true);
    });

    it('converts a small u64 to an unsigned Long', () => {
        // Act
        const result = u64ToUnsignedLong(42n);

        // Assert
        expect(result.unsigned).toBe(true);
        expect(result.toString()).toBe('42');
    });

    it('converts a value exceeding 32 bits', () => {
        // Act
        const result = u64ToUnsignedLong(4294967297n);

        // Assert
        expect(result.unsigned).toBe(true);
        expect(result.toString()).toBe('4294967297');
    });

    it('converts the maximum u64 value', () => {
        // Act
        const result = u64ToUnsignedLong(2n ** 64n - 1n);

        // Assert
        expect(result.unsigned).toBe(true);
        expect(result.toString()).toBe('18446744073709551615');
    });
});
