import {expect} from 'chai';

import {ValueObject} from '~/common/utils/object';
import {TIMER} from '~/common/utils/timer';
import {expectCondition} from '~/test/mocha/common/utils';

/**
 * Test map utils.
 */
export function run(): void {
    describe('utils::timer', function () {
        describe('debounce', function () {
            it('actually debounces function calls', async function () {
                const callCounter = new ValueObject(0);
                const debouncedIncrementCounter = TIMER.debounce(
                    () => (callCounter.value += 1),
                    30,
                );
                expect(callCounter.value, 'initial').to.equal(0);
                debouncedIncrementCounter();
                debouncedIncrementCounter();
                await TIMER.sleep(10);
                debouncedIncrementCounter();
                expect(callCounter.value, 'before wait time').to.equal(0);
                await expectCondition(() => callCounter.value > 0, 'call counter increased', 5, 50);
                expect(callCounter.value, 'final').to.equal(1);
            });

            it('calls debounced function with latest arguments', async function () {
                const argumentTracker = new ValueObject<undefined | string>(undefined);
                const debounced = TIMER.debounce(
                    (arg: string) => (argumentTracker.value = arg),
                    20,
                );
                expect(argumentTracker.value, 'initial').to.be.undefined;
                debounced('hello');
                debounced('big');
                debounced('world');
                await expectCondition(
                    () => argumentTracker.value !== undefined,
                    'argument is not undefined',
                    2,
                    50,
                );
                expect(argumentTracker.value, 'final').to.equal('world');
            });
        });
    });
}
