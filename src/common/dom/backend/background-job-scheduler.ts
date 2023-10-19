// Scheduler for background jobs, running in the backend worker.

import type {Logger, LoggerFactory} from '~/common/logging';
import type {u53} from '~/common/types';
import {assert} from '~/common/utils/assert';

export class JobHandle {
    public constructor(
        public readonly intervalId: u53,
        public readonly description: string,
    ) {}
}

export class BackgroundJobScheduler {
    private readonly _handles = new Set<JobHandle>();
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
     * @param tag A short description of this job, used ofr debugging purposes.
     * @param intervalSeconds The job will be started with this interval in seconds.
     * @param runImmediately By default, the first run will happen after {@link intervalMs}. When
     *   this is set to `true`, the first run will happen immediately.
     */
    public scheduleRecurringJob(
        job: (log: Logger) => void,
        tag: string,
        intervalSeconds: u53,
        runImmediately = false,
    ): JobHandle {
        // The handler binds a logger to the job
        const handler = (): void => job(this._logging.logger(`${this._log.prefix?.[0]}.${tag}`));

        // Schedule job at specified interval
        const intervalId = self.setInterval(handler, intervalSeconds * 1000);

        // Register job handle
        const handle = new JobHandle(intervalId, tag);
        this._handles.add(handle);

        // If necessary, run job immediately (in separate task)
        if (runImmediately) {
            self.setTimeout(handler, 0);
        }

        this._log.debug(`Scheduled background job "${tag}" every ${intervalSeconds}s`);
        return handle;
    }

    /**
     * Cancel a recurring job.
     *
     * Return whether the job was cancelled (true) or was not scheduled anymore (false).
     *
     * @param handle The job to cancel.
     */
    public cancelRecurringJob(handle: JobHandle): boolean {
        if (this._handles.delete(handle)) {
            self.clearInterval(handle.intervalId);
            this._log.debug(`Cancelled recurring job "${handle.description}"`);
            return true;
        }
        return false;
    }

    /**
     * Cancel all recurring jobs.
     *
     * Return the number of cancelled jobs.
     */
    public cancelAll(): u53 {
        const count = this._handles.size;
        for (const handle of this._handles) {
            const cancelled = this.cancelRecurringJob(handle);
            assert(cancelled, 'Job could not be cancelled');
        }
        assert(
            this._handles.size === 0,
            `After cancelling all jobs, there are still ${this._handles.size} handles registered`,
        );
        return count;
    }
}
