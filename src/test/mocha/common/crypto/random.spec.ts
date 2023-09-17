import {expect} from 'chai';

import type {CryptoBackend} from '~/common/crypto';
import {randomPkcs7PaddingLength} from '~/common/crypto/random';
import type {u8} from '~/common/types';
import {byteView} from '~/common/utils/byte';

/**
 * Helper function to return a crypto backend with a `randomBytes` function that always returns the
 * same integer to byte 0 of the buffer.
 *
 * This should only be used for testing `randomU8`.
 */
function unsafeRandomBytesReturnU8(val: u8): Pick<CryptoBackend, 'randomBytes'> {
    return {
        randomBytes: (buffer) => {
            byteView(Uint8Array, buffer)[0] = val;
            return buffer;
        },
    };
}

/**
 * Test of random utils.
 */
export function run(): void {
    describe('Random', function () {
        describe('randomPkcs7PaddingLength', function () {
            it('returns at least 1', function () {
                const padLength = randomPkcs7PaddingLength(unsafeRandomBytesReturnU8(0));
                expect(padLength).to.equal(1);
            });

            it('without constraints, returns the randomly determined pad length', function () {
                for (let i = 1; i <= 255; i++) {
                    const padLength = randomPkcs7PaddingLength(unsafeRandomBytesReturnU8(i));
                    expect(padLength).to.equal(i);
                }
            });

            for (const minTotalLength of [24, 32, 42]) {
                it('with constraints, ensure that padded data length is ≥ minTotalLength', function () {
                    const randomLength = 4; // Chosen by fair dice roll

                    // Combined values ≤ minTotalLength
                    for (let i = 1; i <= minTotalLength - randomLength; i++) {
                        const padLength = randomPkcs7PaddingLength(
                            unsafeRandomBytesReturnU8(randomLength),
                            {
                                currentLength: i,
                                minTotalLength,
                            },
                        );
                        expect(padLength).to.equal(minTotalLength - i);
                    }

                    // Combined values > minTotalLength
                    const padLength = randomPkcs7PaddingLength(
                        unsafeRandomBytesReturnU8(randomLength),
                        {
                            currentLength: minTotalLength,
                            minTotalLength,
                        },
                    );
                    expect(padLength).to.equal(randomLength);
                });
            }
        });
    });
}
