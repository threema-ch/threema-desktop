import {expect} from 'chai';

import {isIterable} from '~/common/utils/object';

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::object', function () {
        describe('isIterable', function () {
            it('array', () => expect(isIterable(new Uint8Array(4))).to.be.true);
            it('string', () => expect(isIterable('abcdefg')).to.be.true);
            it('null', () => expect(isIterable(null)).to.be.false);
            it('undefined', () => expect(isIterable(null)).to.be.false);
        });
    });
}
