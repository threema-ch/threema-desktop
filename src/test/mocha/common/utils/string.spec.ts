import {expect} from 'chai';

import {getGraphemeClusters, localeSort} from '~/common/utils/string';

export function run(): void {
    describe('utils::string', function () {
        describe('localeSort', function () {
            it('should sort in case insensitive and locale-aware order', function () {
                expect(
                    ['zzz', 'ZZZ', 'Qqq', 'qqq', 'aaa', 'acc', 'Abb', 'Àha', 'àha'].sort(
                        localeSort,
                    ),
                ).to.eql(['aaa', 'Abb', 'acc', 'àha', 'Àha', 'qqq', 'Qqq', 'zzz', 'ZZZ']);
            });
        });

        describe('getGraphemeClusters', function () {
            it('split regular ASCII strings', function () {
                expect(getGraphemeClusters('hello', 0)).to.eql([]);
                expect(getGraphemeClusters('hello', 1)).to.eql(['h']);
                expect(getGraphemeClusters('hello', 2)).to.eql(['h', 'e']);
            });

            // Note: Does not work in Firefox!
            it('properly split emoji', function () {
                expect(getGraphemeClusters('👨‍👩‍👧‍👦🦄 emoji family', 0)).to.eql([]);
                expect(getGraphemeClusters('👨‍👩‍👧‍👦🦄 emoji family', 1)).to.eql(['👨‍👩‍👧‍👦']);
                expect(getGraphemeClusters('👨‍👩‍👧‍👦🦄 emoji family', 2)).to.eql(['👨‍👩‍👧‍👦', '🦄']);
                expect(getGraphemeClusters('👨‍👩‍👧‍👦a🦄', 3)).to.eql(['👨‍👩‍👧‍👦', 'a', '🦄']);
            });

            it('properly deal with spaces', function () {
                expect(getGraphemeClusters('a b c', 4)).to.eql(['a', ' ', 'b', ' ']);
                expect(getGraphemeClusters('🦄 spaced unicorn', 2)).to.eql(['🦄', ' ']);
            });

            it('deal with short input strings', function () {
                expect(getGraphemeClusters('', 0)).to.eql([]);
                expect(getGraphemeClusters('', 1)).to.eql([]);
                expect(getGraphemeClusters('', 2)).to.eql([]);
                expect(getGraphemeClusters('hi', 3)).to.eql(['h', 'i']);
            });
        });
    });
}
