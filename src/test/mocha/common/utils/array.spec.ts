import * as chai from 'chai';

import {type u8} from '~/common/types';
import {groupArray, joinConstArray} from '~/common/utils/array';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::array', function () {
        describe('groupArray', function () {
            const testCases: {array: u8[]; size: u8; expected: u8[][]}[] = [
                {
                    array: [1, 2, 3, 4, 5],
                    size: 3,
                    expected: [
                        [1, 2, 3],
                        [4, 5],
                    ],
                },
                {
                    array: [1, 2, 3, 4, 5],
                    size: 5,
                    expected: [[1, 2, 3, 4, 5]],
                },
                {
                    array: [1, 2, 3, 4, 5],
                    size: 12,
                    expected: [[1, 2, 3, 4, 5]],
                },
                {
                    array: [1, 2, 3, 4],
                    size: 1,
                    expected: [[1], [2], [3], [4]],
                },
                {
                    array: [1, 2, 3, 4, 5, 6],
                    size: 3,
                    expected: [
                        [1, 2, 3],
                        [4, 5, 6],
                    ],
                },
            ];
            for (const {array, size, expected} of testCases) {
                it(`group array with ${array.length} entries into groups of ${size}`, function () {
                    const grouped = groupArray(array, size);
                    expect(grouped).to.deep.equal(expected);
                });
            }
        });

        describe('joinArray', function () {
            it(`joins three strings`, function () {
                const joined: 'a,bee,c' = joinConstArray(['a', 'bee', 'c'] as const);
                expect(joined).to.equal('a,bee,c');
            });

            it(`joins an empty array`, function () {
                const joined: '' = joinConstArray([] as const);
                expect(joined).to.equal('');
            });
        });
    });
}
