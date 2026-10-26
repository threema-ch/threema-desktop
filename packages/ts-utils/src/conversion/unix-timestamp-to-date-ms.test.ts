import {describe, expect, it} from 'vitest';

import {unixTimestampToDateMs} from './unix-timestamp-to-date-ms.js';

describe('unixTimestampToDateMs', () => {
    it('converts a `u53` millisecond timestamp to a `Date`', () => {
        expect(unixTimestampToDateMs(0).toISOString()).toBe('1970-01-01T00:00:00.000Z');
        expect(unixTimestampToDateMs(60_000).toISOString()).toBe('1970-01-01T00:01:00.000Z');
    });

    it('accepts a `u64` (bigint) millisecond timestamp', () => {
        expect(unixTimestampToDateMs(60_000n).toISOString()).toBe('1970-01-01T00:01:00.000Z');
    });

    it('throws when the timestamp exceeds the JavaScript Date range', () => {
        expect(() => unixTimestampToDateMs(8640000000000001)).toThrow('Invalid timestamp');
    });
});
