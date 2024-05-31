import {expect} from 'chai';

import {assertUnreachable} from '~/common/utils/assert';
import {ReusablePromise} from '~/common/utils/promise';
import {TIMER} from '~/common/utils/timer';

/**
 * Test of object utils.
 */
export function run(): void {
    describe('utils::promise', function () {
        describe('ReusablePromise', function () {
            it('can be subscribed multiple times', async () => {
                const reusablePromise = new ReusablePromise<string>();
                const values: string[] = [];

                // Subscribe twice
                reusablePromise
                    .value()
                    .then((value) => values.push(value))
                    .catch(assertUnreachable);
                reusablePromise
                    .value()
                    .then((value) => values.push(value))
                    .catch(assertUnreachable);

                // Push a value, it must be resolved twice
                reusablePromise.resolve('hello');
                await TIMER.sleep(0); // Required to resolve promises above
                expect(values).to.deep.equal(['hello', 'hello']);

                // Resubscribe with one subscriber
                reusablePromise
                    .value()
                    .then((value) => values.push(value))
                    .catch(assertUnreachable);

                // Push another value
                reusablePromise.resolve('world');
                await TIMER.sleep(0); // Required to resolve promises above
                expect(values).to.deep.equal(['hello', 'hello', 'world']);
            });
        });
    });
}
