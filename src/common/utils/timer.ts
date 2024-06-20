import type {u53, WeakOpaque} from '~/common/types';
import {unwrap} from '~/common/utils/assert';

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
 * Error raised when a timeout occurs.
 */
export class TimeoutError extends Error {
    public constructor(timeoutMs: u53) {
        super(`Timer timed out after ${timeoutMs}ms`);
    }
}

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
            // Note: We know the id will exist prior to the canceller being callable.
            clearTimeout(unwrap(id));
        }

        // Create timeout and return canceller.
        id = setTimeout(() => callback(canceller), delayMs);
        return canceller;
    }

    /**
     * Calls the given callback repetitively until the canceller function has been invoked.
     *
     * @param callback The callback to be called in the given interval.
     * @param intervalMs Amount of milliseconds to wait in between the calls.
     * @param firstCall When to invoke the callback the first time (now or after the first
     *   interval).
     * @returns A function that allows to cancel the timer.
     */
    public repeat(
        callback: TimerCallback,
        intervalMs: u53,
        firstCall: 'now' | 'after-interval',
    ): TimerCanceller {
        let id: IntervalId | undefined = undefined;

        function canceller(): void {
            // Note: We know the id will exist prior to the canceller being
            //       callable.
            clearInterval(unwrap(id));
        }

        // Create interval and return canceller.
        id = setInterval(() => callback(canceller), intervalMs);

        // Make first call now, if necessary
        if (firstCall === 'now') {
            callback(canceller);
        }

        return canceller;
    }

    /**
     * Waits for the given `event` to resolve or `timeoutMs` to elapse (in which case a
     * `TimeoutError` will be thrown).
     *
     * @param event The event to wait for.
     * @param timeoutMs Maximum amount of milliseconds to wait for `event`.
     * @returns the result of `event`.
     * @throws {@link TimeoutError} when `timeoutMs` elapsed before `event` resolved.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public waitFor<T>(event: Promise<T>, timeoutMs: u53): Promise<T> {
        return Promise.race([
            event,
            this.sleep(timeoutMs).then(() => {
                throw new TimeoutError(timeoutMs);
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
     * @param distinctArgs Whether to call the function multiple times with all sets of distinct
     *   args as soon as the debounce timer has elapsed.
     * @param distinctArgsKeySelector Supply a function that calculates the key for a set of args.
     *   Only if a subsequent call of the debounced function resolves to the same key as an already
     *   remembered set of args, the existing set of args will be replaced. If not given and
     *   `distinctArgs` is enabled, the JSON-stringified args will be used as the key. Note: Has no
     *   effect if `distinctArgs` is `false`.
     * @returns A debounced version of `func`.
     */
    public debounce<
        F extends (...args: Parameters<F>) => Exclude<ReturnType<F>, PromiseLike<unknown>>,
    >(
        func: F,
        waitForMs: u53,
        resetOnUpdate: boolean = true,
        distinctArgs: boolean = false,
        distinctArgsKeySelector?: (...args: Parameters<F>) => string,
    ): (...args: Parameters<F>) => void {
        let cancel: TimerCanceller | undefined;
        // Store each distinct set of args to call the function with later.
        const argsMap = new Map<string, Parameters<F>>();

        return (...args: Parameters<F>): void => {
            // Generate the key using the supplied key selector or default to JSON.stringify.
            const key = distinctArgsKeySelector
                ? distinctArgsKeySelector(...args)
                : JSON.stringify(args);
            argsMap.set(key, args);

            // (Re-)schedule, if necessary
            if (cancel === undefined || resetOnUpdate) {
                cancel?.();
                cancel = this.timeout(() => {
                    cancel = undefined;
                    if (distinctArgs) {
                        // Call the function for each distinct set of arguments.
                        argsMap.forEach((value) => {
                            func(...value);
                        });
                    } else {
                        // Get the last set of arguments from the `Map`.
                        const lastArgs = Array.from(argsMap.values()).pop();
                        if (lastArgs !== undefined) {
                            func(...(lastArgs as Parameters<F>));
                        }
                    }
                    argsMap.clear();
                }, waitForMs);
            }
        };
    }
}

export type Timer = GlobalTimer;
export const TIMER: Timer = new GlobalTimer();
