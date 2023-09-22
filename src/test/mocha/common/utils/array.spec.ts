import * as chai from 'chai';

import type {u8} from '~/common/types';
import {entriesReverse, groupArray, joinConstArray} from '~/common/utils/array';
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
            it('joins three strings', function () {
                const joined: 'a,bee,c' = joinConstArray(['a', 'bee', 'c'] as const);
                expect(joined).to.equal('a,bee,c');
            });

            it('joins an empty array', function () {
                const joined: '' = joinConstArray([] as const);
                expect(joined).to.equal('');
            });
        });

        describe('entriesReverse', function () {
            it('iterates in reverse over array of length 3', function () {
                const arr = ['a', 'b', 42];
                const iterator = entriesReverse(arr);
                expect(iterator.next()).to.deep.equal({value: [2, 42], done: false});
                expect(iterator.next()).to.deep.equal({value: [1, 'b'], done: false});
                expect(iterator.next()).to.deep.equal({value: [0, 'a'], done: false});
                expect(iterator.next()).to.deep.equal({value: undefined, done: true});
            });

            it('handles arrays of length 1', function () {
                const iterator = entriesReverse(['x']);
                expect(iterator.next()).to.deep.equal({value: [0, 'x'], done: false});
                expect(iterator.next()).to.deep.equal({value: undefined, done: true});
            });

            it('handles empty arrays', function () {
                const iterator = entriesReverse([]);
                expect(iterator.next()).to.deep.equal({value: undefined, done: true});
            });
        });
    });
}
