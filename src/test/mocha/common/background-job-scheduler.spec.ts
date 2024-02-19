import {expect} from 'chai';

import {BackgroundJobScheduler} from '~/common/background-job-scheduler';
import {TIMER} from '~/common/utils/timer';
import {TestLoggerFactory} from '~/test/mocha/common/backend-mocks';

const logging = new TestLoggerFactory('bjs');

/**
 * Test map utils.
 */
export function run(): void {
    describe('BackgroundJobScheduler', function () {
        let scheduler: BackgroundJobScheduler;
        this.beforeEach(() => (scheduler = new BackgroundJobScheduler(logging)));
        this.afterEach(() => scheduler.cancelAll());

        it('can cancel all jobs at once', () => {
            let nRuns = 0;

            scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 1,
                initialTimeoutS: 0,
            });
            scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 1,
                initialTimeoutS: 1,
            });

            expect(scheduler.cancelAll()).to.equal(2);
            expect(nRuns).to.equal(0);
        });

        it('can cancel jobs immediately without them ever running', function () {
            let nRuns = 0;

            {
                const job = scheduler.scheduleRecurringJob(() => ++nRuns, {
                    tag: 'a',
                    intervalS: 1,
                    initialTimeoutS: 0,
                });
                job.cancel();
            }
            {
                const job = scheduler.scheduleRecurringJob(() => ++nRuns, {
                    tag: 'a',
                    intervalS: 1,
                    initialTimeoutS: 1,
                });
                job.cancel();
            }

            expect(nRuns).to.equal(0);
            expect(scheduler.cancelAll()).to.equal(0);
        });

        it('initial run without initial timeout only takes a microtask', function (done) {
            let nRuns = 0;

            scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 1,
                initialTimeoutS: 0,
            });
            TIMER.microtask(() => {
                expect(nRuns).to.equal(1);
                done();
            });

            expect(nRuns).to.equal(0);
            expect(scheduler.cancelAll()).to.equal(1);
        });

        it('initial run with initial timeout takes the desired amount of time', async function () {
            let nRuns = 0;

            scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 1,
                initialTimeoutS: 0.001,
            });

            await TIMER.sleep(2);
            expect(nRuns).to.equal(1);
            expect(scheduler.cancelAll()).to.equal(1);
        });

        it('can cancel after initial run without initial timeout', async function () {
            let nRuns = 0;

            const job = scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 0.01,
                initialTimeoutS: 0,
            });

            expect(nRuns).to.equal(0);
            await new Promise<void>((resolve) => {
                TIMER.microtask(resolve);
            });
            expect(nRuns).to.equal(1);
            await TIMER.sleep(10);
            job.cancel();
            expect(nRuns).to.equal(2);
            expect(scheduler.cancelAll()).to.equal(0);
        });

        it('can cancel after initial run with initial timeout', async function () {
            let nRuns = 0;

            const job = scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 0.01,
                initialTimeoutS: 0.001,
            });

            expect(nRuns).to.equal(0);
            await TIMER.sleep(10);
            expect(nRuns).to.equal(1);
            await TIMER.sleep(10);
            job.cancel();
            expect(nRuns).to.equal(2);
            expect(scheduler.cancelAll()).to.equal(0);
        });

        it('runs repetitively until cancelled', async function () {
            let nRuns = 0;

            const job = scheduler.scheduleRecurringJob(() => ++nRuns, {
                tag: 'a',
                intervalS: 0.01,
                initialTimeoutS: 0.001,
            });

            expect(nRuns).to.equal(0);
            await TIMER.sleep(10);
            expect(nRuns).to.equal(1);
            await TIMER.sleep(10);
            expect(nRuns).to.equal(2);
            await TIMER.sleep(10);
            expect(nRuns).to.equal(3);
            job.cancel();
            expect(nRuns).to.equal(3);
            expect(scheduler.cancelAll()).to.equal(0);
        });
    });
}
