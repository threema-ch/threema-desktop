import type {u53, WeakOpaque} from '~/common/types';

// The following globals exist in both DOM and Node, so we'll just assume they're always available.
type TimeoutId = WeakOpaque<u53, {readonly TimeoutId: unique symbol}>;
type IntervalId = WeakOpaque<u53, {readonly TimeoutId: unique symbol}>;
declare const setTimeout: (callback: () => void, delayMs: u53) => TimeoutId;
declare const clearTimeout: (id: TimeoutId) => void;
declare const setInterval: (callback: () => void, intervalMs: u53) => IntervalId;
declare const clearInterval: (id: IntervalId) => void;
declare const queueMicrotask: (callback: () => void) => void;

/**
 * Cancels the timer.
 */
export type TimerCanceller = () => void;

/**
 * Callback for a timer.
 */
export type TimerCallback = (canceller: TimerCanceller) => void;

/**
 * A timer allowing to schedule timers that fire once after a timeout and those
 * that fire repetitively in an interval.
 */
class GlobalTimer {
    /**
     * Queue the given callback as a microtask.
     *
     * @param callback The callback to be called in the given delay.
     */
    public microtask(callback: () => void): void {
        queueMicrotask(callback);
    }

    /**
     * Sleep asynchronously for the given timeout.
     *
     * @param timeoutMs Amount of milliseconds to sleep.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public sleep(delayMs: u53): Promise<void> {
        // eslint-disable-next-line no-promise-executor-return
        return new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    /**
     * Calls the given callback once the given delay elapsed until the canceller function has been
     * invoked.
     *
     * @param callback The callback to be called in the given delay.
     * @param delayMs Amount of milliseconds to wait.
     * @returns A function that allows to cancel the timer.
     */
    public timeout(callback: TimerCallback, delayMs: u53): TimerCanceller {
        let id: TimeoutId | undefined = undefined;

        function canceller(): void {
            // Note: We know the id will exist prior to the canceller being
            //       callable.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            clearTimeout(id!);
        }

        // Create timeout and return canceller.
        id = setTimeout(() => callback(canceller), delayMs);
        return canceller;
    }

    /**
     * Calls the given callback repetitively until the canceller function has
     * been invoked.
     *
     * @param callback The callback to be called in the given interval.
     * @param intervalMs Amount of milliseconds to wait in between the calls.
     * @returns A function that allows to cancel the timer.
     */
    public repeat(callback: TimerCallback, intervalMs: u53): TimerCanceller {
        let id: IntervalId | undefined = undefined;

        function canceller(): void {
            // Note: We know the id will exist prior to the canceller being
            //       callable.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            clearInterval(id!);
        }

        // Create interval and return canceller.
        id = setInterval(() => callback(canceller), intervalMs);
        return canceller;
    }

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public waitFor<T>(event: Promise<T>, timeoutMs: u53): Promise<T> {
        return Promise.race([
            event,
            this.sleep(timeoutMs).then(() => {
                throw new Error('Timer timed out');
            }),
        ]);
    }

    /**
     * Create a version of `func` with the same signature but that is executed only once if it is
     * called multiple times with less than `waitForMillis` milliseconds between calls.
     *
     * @param func The function to debounce. After the timeout, the function is always called with
     *   the latest argument value.
     * @param waitForMs The number of milliseconds to wait after the last call to `func` (if
     *   {@link resetOnUpdate} is true) or after the first call to `func` (if {@link resetOnUpdate}
     *   is false) before effectively calling it.
     * @param resetOnUpdate Whether the timer is reset on updates or not. If set to `true`, the
     *   function is only executed if there is no call within {@link waitForMs}. If set to `false`,
     *   the function is executed {@link waitForMs} after the first call.
     * @returns A debounced version of `func`
     */
    public debounce<
        F extends (...args: Parameters<F>) => Exclude<ReturnType<F>, PromiseLike<unknown>>,
    >(func: F, waitForMs: u53, resetOnUpdate: boolean = true): (...args: Parameters<F>) => void {
        let cancel: TimerCanceller | undefined;
        let lastArgs: Parameters<F>;

        return (...args: Parameters<F>): void => {
            lastArgs = args;

            // (Re-)schedule, if necessary
            if (cancel === undefined || resetOnUpdate) {
                cancel?.();
                cancel = this.timeout(() => {
                    cancel = undefined;
                    func(...lastArgs);
                }, waitForMs);
            }
        };
    }
}

export type Timer = GlobalTimer;
export const TIMER: Timer = new GlobalTimer();
