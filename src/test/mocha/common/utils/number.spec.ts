import * as chai from 'chai';
import Long from 'long';

import {ensureU64, type u53, type u64} from '~/common/types';
import {byteSizeToHumanReadable, hexLeToU64, intoU64, u64ToHexLe} from '~/common/utils/number';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

export function run(): void {
    describe('utils::number', function () {
        describe('intoU64', function () {
            const testCases: [input: Long, output: u64][] = [
                [Long.fromNumber(0, true), 0n],
                [Long.fromNumber(10, true), 10n],
                [Long.fromNumber(4294967297, true), 4294967297n],
                [
                    Long.fromValue(`${Number.MAX_SAFE_INTEGER}`, true),
                    BigInt(Number.MAX_SAFE_INTEGER),
                ],
            ];
            for (const [input, expectedOutput] of testCases) {
                it(`should correctly convert '${expectedOutput}'`, function () {
                    const output = intoU64(input);
                    expect(output).to.equal(expectedOutput);
                });
            }

            it('should throw an error if a signed long is used', function () {
                expect(() => intoU64(Long.fromNumber(20, false))).to.throw(
                    'Long value is not unsigned',
                );
            });
        });

        describe('u64ToHexLe', function () {
            it('should be little endian', function () {
                expect(u64ToHexLe(ensureU64(0xabbccddeeff00110n))).to.equal('1001f0efdecdbcab');
            });

            it('should only use lowercase hex characters', function () {
                expect(u64ToHexLe(ensureU64(0xabbccddeeff00110n))).to.match(/^[0-10a-f]{16}$/u);
            });

            it('should correctly do byte zero padding to a 16 character string', function () {
                expect(u64ToHexLe(ensureU64(1337n))).to.equal('3905000000000000');
            });

            it('should correctly encode the u64 maximum value', function () {
                expect(u64ToHexLe(ensureU64(0xffffffffffffffffn))).to.equal('ffffffffffffffff');
            });

            it('should correctly encode the u64 minimum value', function () {
                expect(u64ToHexLe(ensureU64(0n))).to.equal('0000000000000000');
            });
        });

        describe('hexLeToU64', function () {
            it('should be little endian', function () {
                expect(hexLeToU64('1001f0efdecdbcab')).to.equal(ensureU64(0xabbccddeeff00110n));
            });

            it('should accept lowercase and uppercase hex characters', function () {
                expect(hexLeToU64('1001f0efdecdbcab')).to.equal(ensureU64(0xabbccddeeff00110n));
                expect(hexLeToU64('1001F0EFDECDBCAB')).to.equal(ensureU64(0xabbccddeeff00110n));
            });

            it('should reject invalid hex values', function () {
                expect(() => hexLeToU64('1001f0efdecdefgh')).to.throw('hexLeToU64 failed');
            });

            it('should require 8 bytes', function () {
                expect(() => hexLeToU64('1001f0efdecdbc')).to.throw(
                    'hexLeToU64 failed: Value does not contain 8 bytes, but 7',
                );
                expect(() => hexLeToU64('1001f0efdecdbcabff')).to.throw(
                    'hexLeToU64 failed: Value does not contain 8 bytes, but 9',
                );
            });
        });

        describe('byteSizeToHumanReadable', function () {
            const testCases: [bytes: u53, humanReadable: string][] = [
                [0, '0 B'],
                [1, '1 B'],
                [987, '987 B'],
                [1000, '1.00 kB'],
                [1024, '1.02 kB'],
                [1989, '1.99 kB'],
                [1994, '1.99 kB'],
                [1995, '2.00 kB'],
                [2000, '2.00 kB'],
                [1000000, '1.00 MB'],
                [1000000000, '1.00 GB'],
                [512120000000, '512.12 GB'],
                [1000000000000, '1.00 TB'],
                [1000000000000000, '1.00 PB'],
            ];

            for (const testCase of testCases) {
                it(`converts ${testCase[0]} bytes to "${testCase[1]}"`, function () {
                    expect(byteSizeToHumanReadable(testCase[0])).to.equal(testCase[1]);
                });
            }
        });
    });
}
