import {expect} from 'chai';

import type {u53} from '~/common/types';
import {isIterable, pick} from '~/common/utils/object';

/**
 * Test of object utils.
 */
export function run(): void {
    describe('utils::object', function () {
        describe('isIterable', function () {
            it('array', () => expect(isIterable(new Uint8Array(4))).to.be.true);
            it('string', () => expect(isIterable('abcdefg')).to.be.true);
            it('null', () => expect(isIterable(null)).to.be.false);
            it('undefined', () => expect(isIterable(null)).to.be.false);
        });
        describe('pick', function () {
            it('example 1', () => expect(pick({}, [])).to.be.deep.equal({}));
            it('example 2', () => expect(pick({a: 1, b: undefined}, [])).to.be.deep.equal({}));
            it('example 3', () =>
                expect(pick({a: 1, b: undefined}, ['a'])).to.be.deep.equal({a: 1}));
            it('example 4', () =>
                expect(pick({a: 1, b: undefined}, ['a', 'a'])).to.be.deep.equal({a: 1}));
            it('example 5', () =>
                expect(pick({a: 1, b: undefined}, ['a', 'b'])).to.be.deep.equal({
                    a: 1,
                    b: undefined,
                }));
            it('example 6', () => {
                const o: Partial<{a: u53; b: u53}> = {a: 1};
                expect(pick(o, ['a', 'b'])).to.be.deep.equal({a: 1});
            });
        });
        describe('pick with parametrized restricted type', function () {
            it('example 6', () => {
                interface A {
                    a: u53;
                    b: u53;
                    c: boolean;
                }
                interface Aa {
                    a: u53;
                    d: u53;
                }
                const o: Partial<A> = {a: 1, c: true};
                expect(pick(o, ['a', 'b'])).to.be.deep.equal({a: 1});
                expect(pick<Partial<A>>(o, ['a', 'b'])).to.be.deep.equal({a: 1});
                expect(pick<Partial<Aa>>(o, ['a', 'd'])).to.be.deep.equal({a: 1});
                expect(pick<Partial<Aa>>(o, ['d'])).to.be.deep.equal({});
            });
        });
    });
}
