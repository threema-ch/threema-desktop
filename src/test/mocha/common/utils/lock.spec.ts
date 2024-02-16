import {expect} from 'chai';

import type {u53} from '~/common/types';
import {AsyncLock} from '~/common/utils/lock';
import {TIMER} from '~/common/utils/timer';

/**
 * Test Lock utils.
 */
export function run(): void {
    describe('Lock', function () {
        it('runs executors serially', async function () {
            const lock = new AsyncLock();
            const delays = [45, 37, 24, 30, 7, 13, 20, 10, 17, 4];
            const unguarded: u53[] = [];
            const guarded: u53[] = [];

            // Run 10 async tasks with overlapping runtimes. If the execution were not guarded by
            // the lock, they would insert the results in a different order.
            await Promise.all([
                ...delays.map(async (sleepMs) => {
                    await TIMER.sleep(sleepMs);
                    unguarded.push(sleepMs);
                }),

                // eslint-disable-next-line @typescript-eslint/promise-function-async
                ...delays.map((sleepMs) =>
                    lock.with(async () => {
                        await TIMER.sleep(sleepMs);
                        guarded.push(sleepMs);
                    }),
                ),
            ]);

            expect(unguarded).to.have.ordered.members([4, 7, 10, 13, 17, 20, 24, 30, 37, 45]);
            expect(guarded).to.have.ordered.members(delays);
        });
    });
}
