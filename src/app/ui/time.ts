import type {Logger} from '~/common/logging';
import {isSameMinute} from '~/common/utils/date';
import {ReadableStore} from '~/common/utils/store';
import {TIMER} from '~/common/utils/timer';

interface SystemTimeStoreValue {
    /**
     * The current system time. Updates every _full_ minute.
     */
    readonly current: Date;
}

/**
 * A store containing the current time.
 *
 * Note: The store updates every _full_ minute (i.e. if the seconds are zero).
 */
export class SystemTimeStore extends ReadableStore<SystemTimeStoreValue> {
    public constructor(protected override readonly _log: Logger) {
        const initialState: SystemTimeStoreValue = {current: new Date()};
        super(initialState);
        this._log.debug('SystemTimeStore created with initial state:', this.get());

        const intervalMs = 1000; // 1 second
        TIMER.repeat(this._updateState, intervalMs);
        this._log.debug(`System time observer started with interval: ${intervalMs}ms`);
    }

    private readonly _updateState = (): void => {
        const now: SystemTimeStoreValue = {current: new Date()};

        if (isSameMinute(now.current, this.get().current)) {
            return;
        }

        if (this._update(now)) {
            this._dispatch(now);
        } else {
            this._log.error(`Observed system time has changed but store could not be updated`);
        }
    };
}
