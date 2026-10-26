import {describe, expect, it} from 'vitest';

import {byteSizeToHumanReadable} from './byte-size-to-human-readable.js';

describe('byteSizeToHumanReadable', () => {
    const testCases: [bytes: number, humanReadable: string][] = [
        [0, '0 B'],
        [1, '1 B'],
        [987, '987 B'],
        [1000, '1.00 kB'],
        [1024, '1.02 kB'],
        [1989, '1.99 kB'],
        [1994, '1.99 kB'],
        [1995, '2.00 kB'],
        [2000, '2.00 kB'],
        [1_000_000, '1.00 MB'],
        [1_000_000_000, '1.00 GB'],
        [512_120_000_000, '512.12 GB'],
        [1_000_000_000_000, '1.00 TB'],
        [1_000_000_000_000_000, '1.00 PB'],
    ];

    for (const [bytes, humanReadable] of testCases) {
        it(`converts ${bytes} bytes to "${humanReadable}"`, () => {
            expect(byteSizeToHumanReadable(bytes)).toBe(humanReadable);
        });
    }

    it('falls back to "???" when the size exponent exceeds the known SI units', () => {
        // 1e25 ≈ 10^25 → exponent 8 (YB) which is beyond the table.
        expect(byteSizeToHumanReadable(1e25)).toMatch(/ \?\?\?$/u);
    });
});
