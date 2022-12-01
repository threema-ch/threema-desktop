import {type u53, type WeakOpaque} from '~/common/types';

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
export interface Timer {
    /**
     * Sleep asynchronously for the given timeout.
     * @param timeoutMs Amount of milliseconds to sleep.
     */
    readonly sleep: (timeoutMs: u53) => Promise<void>;

    /**
     * Calls the given callback once the given delay elapsed until the canceller function has been
     * invoked.
     * @param callback The callback to be called in the given delay.
     * @param delayMs Amount of milliseconds to wait.
     * @returns A function that allows to cancel the timer.
     */
    readonly timeout: (callback: TimerCallback, delayMs: u53) => TimerCanceller;

    /**
     * Calls the given callback repetitively until the canceller function has
     * been invoked.
     * @param callback The callback to be called in the given interval.
     * @param intervalMs Amount of milliseconds to wait in between the calls.
     * @returns A function that allows to cancel the timer.
     */
    readonly repeat: (callback: TimerCallback, intervalMs: u53) => TimerCanceller;
}

// The globals setTimeout` and `setInterval` exist in both DOM and Node, so
// we'll just assume they're always available.
type TimeoutId = WeakOpaque<u53, {readonly TimeoutId: unique symbol}>;
type IntervalId = WeakOpaque<u53, {readonly TimeoutId: unique symbol}>;
declare const setTimeout: (callback: () => void, delayMs: u53) => TimeoutId;
declare const setInterval: (callback: () => void, intervalMs: u53) => IntervalId;
declare const clearInterval: (id: IntervalId | TimeoutId) => void;

/** @inheritdoc */
export class GlobalTimer implements Timer {
    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public sleep(delayMs: u53): Promise<void> {
        // eslint-disable-next-line no-promise-executor-return
        return new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    /** @inheritdoc */
    public timeout(callback: TimerCallback, delayMs: u53): TimerCanceller {
        let id: TimeoutId | undefined = undefined;

        function canceller(): void {
            // Note: We know the id will exist prior to the canceller being
            //       callable.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            clearInterval(id!);
        }

        // Create timeout and return canceller.
        id = setTimeout(() => callback(canceller), delayMs);
        return canceller;
    }

    /** @inheritdoc */
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
}
