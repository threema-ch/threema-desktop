import {describe, expect, it} from 'vitest';

import {dateToUnixTimestampS} from './date-to-unix-timestamp-s.js';

describe('dateToUnixTimestampS', () => {
    it('returns the unix second timestamp as a u32', () => {
        expect(dateToUnixTimestampS(new Date('1970-01-01T00:00:00.000Z'))).toBe(0);
        expect(dateToUnixTimestampS(new Date('1970-01-01T00:01:00.000Z'))).toBe(60);
    });

    it('truncates sub-second precision', () => {
        // 1.999s → 1
        expect(dateToUnixTimestampS(new Date(1999))).toBe(1);
    });
});
