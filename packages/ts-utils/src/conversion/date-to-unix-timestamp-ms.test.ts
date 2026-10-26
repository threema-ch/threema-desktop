import {describe, expect, it} from 'vitest';

import {dateToUnixTimestampMs} from './date-to-unix-timestamp-ms.js';

describe('dateToUnixTimestampMs', () => {
    it('returns the unix millisecond timestamp as a bigint', () => {
        expect(dateToUnixTimestampMs(new Date('1970-01-01T00:00:00.000Z'))).toBe(0n);
        expect(dateToUnixTimestampMs(new Date('1970-01-01T00:01:00.000Z'))).toBe(60_000n);
    });
});
