// Scheduler for background jobs, running in the backend worker.

import type {u53} from '@threema/ts-utils/integer/u53';
import {TIMER} from '@threema/ts-utils/timer/global-timer';

import type {Logger, LoggerFactory} from '~/common/logging';
import {assert} from '~/common/utils/assert';
import {AbortRaiser} from '~/common/utils/signal';
/** Cancels subsequent execution of the job. */
export type JobCanceller = () => void;
/** Cancels subsequent execution of the job und restart with updated interval. */
export type JobIntervalUpdater = (intervalS: u53) => void;

export interface JobHandle {
    readonly tag: string;
    readonly cancel: JobCanceller;
    readonly update: JobIntervalUpdater;
}

interface InternalJobHandle extends JobHandle {
    readonly job: Job;
}

type Job = (log: Logger, cancel: JobCanceller, update: JobIntervalUpdater) => void;

export class BackgroundJobScheduler {
    private readonly _handles = new Set<InternalJobHandle>();
    private readonly _log: Logger;

    public constructor(private readonly _logging: LoggerFactory) {
        this._log = _logging.logger('backend.background-jobs');
    }

    /**
     * Schedule a recurring job.
     *
     * Jobs will be started on a fixed interval.
     *
     * @param job The job function.
     * @param options.tag A short description of this job, used for debugging purposes.
     * @param options.intervalS The job will be started with this interval in seconds.
     * @param options.initialTimeoutS Amount of seconds until the first run of the job is invoked. If
     *   set to `0` the first run will be queued as a microtask.
     */
    public scheduleRecurringJob(
        job: Job,
        options: {
            readonly tag: string;
            readonly intervalS: u53;
            readonly initialTimeoutS: u53;
        },
    ): JobHandle {
        const log = this._logging.logger(`${this._log.prefix?.[0]}.${options.tag}`);

        // Abort raiser that cancels and unsubscribes the job
        let abort = new AbortRaiser<void>();
        abort.subscribe(() => {
            if (this._handles.delete(handle)) {
                this._log.debug(`Cancelled recurring job '${options.tag}'`);
            }
        });

        // eslint-disable-next-line func-style
        const cancel = (): void => abort.raise();

        const update = (intervalS: u53): void => {
            cancel();
            abort = new AbortRaiser<void>();
            abort.subscribe(() => {
                if (this._handles.delete(handle)) {
                    this._log.debug(`Cancelled recurring job '${options.tag}'`);
                }
            });
            this._handles.add(handle);

            abort.subscribe(
                TIMER.repeat(() => job(log, cancel, update), intervalS * 1000, 'after-interval'),
            );
            this._log.debug(
                `Scheduled updated background job '${options.tag}' to run every ${intervalS}s`,
            );
        };

        // Create and register job handle
        const handle: InternalJobHandle = {
            job,
            tag: options.tag,
            cancel,
            update,
        };
        this._handles.add(handle);
        this._log.debug(
            `Scheduled background job '${options.tag}' to run every ${options.intervalS}s after ${options.initialTimeoutS}s`,
        );

        // Create function to run job once immediately and schedule the job at the specified interval
        // eslint-disable-next-line func-style
        const runAndSchedule = (): void => {
            // Run once
            job(log, cancel, update);

            // Schedule subsequent execution and cancel timer on abort
            abort.subscribe(
                TIMER.repeat(
                    () => job(log, cancel, update),
                    options.intervalS * 1000,
                    'after-interval',
                ),
            );
        };

        // Schedule to run later or immediately (as a microtask)
        if (options.initialTimeoutS === 0) {
            TIMER.microtask(runAndSchedule);
        } else {
            abort.subscribe(TIMER.timeout(runAndSchedule, options.initialTimeoutS * 1000));
        }

        return handle;
    }

    /**
     * This function should only used for debugging purposes, only call via Debug-Panel.
     */
    public forceJobExecution(): void {
        const registeredJobsNames = [...this._handles].map(({tag}) => `'${tag}'`);

        this._log.info(
            `BackgroundJobScheduler.forceJobExecution() called, executing ${registeredJobsNames.length} jobs [${registeredJobsNames}]`,
        );

        this._handles.forEach(({job, update, cancel, tag}) => {
            this._log.info(`Executing job with tag: "${tag}" by force`);
            job(this._log, cancel, update);
        });
    }

    /**
     * Cancel all recurring jobs.
     *
     * Return the number of cancelled jobs.
     */
    public cancelAll(): u53 {
        const count = this._handles.size;
        for (const handle of this._handles) {
            handle.cancel();
        }
        assert(
            this._handles.size === 0,
            `After cancelling all jobs, there are still ${this._handles.size} handles registered`,
        );
        return count;
    }
}
