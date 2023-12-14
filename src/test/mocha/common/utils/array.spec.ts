import * as chai from 'chai';

import type {u8} from '~/common/types';
import {entriesReverse, chunk, joinConstArray, group} from '~/common/utils/array';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::array', function () {
        describe('chunk', function () {
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
                it(`split array with ${array.length} entries into chunks of ${size}`, function () {
                    const chunked = chunk(array, size);
                    expect(chunked).to.deep.equal(expected);
                });
            }
        });

        describe('group', function () {
            it('groups values according to the grouping function', function () {
                const array = [1.5, 2.5, 2.75, 3];

                const grouped = group(array, (value) => Math.floor(value));

                expect(grouped).to.deep.equal(
                    new Map<u8, u8[]>([
                        [1, [1.5]],
                        [2, [2.5, 2.75]],
                        [3, [3]],
                    ]),
                );
            });
        });

        describe('joinArray', function () {
            it('joins three strings', function () {
                const joined: 'a,bee,c' = joinConstArray(['a', 'bee', 'c']);
                expect(joined).to.equal('a,bee,c');
            });

            it('joins an empty array', function () {
                const joined: '' = joinConstArray([]);
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
