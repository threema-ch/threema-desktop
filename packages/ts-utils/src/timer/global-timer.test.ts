import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {TIMER} from './global-timer.js';
import {TimeoutError} from './timeout-error.js';

describe('GlobalTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('microtask', () => {
        it('schedules the callback as a microtask', async () => {
            // Arrange
            const order: string[] = [];

            // Act
            TIMER.microtask(() => order.push('microtask'));
            order.push('sync');
            await Promise.resolve();

            // Assert
            expect(order).toEqual(['sync', 'microtask']);
        });
    });

    describe('sleep', () => {
        it('resolves after the requested delay', async () => {
            // Arrange
            let resolved = false;
            const promise = TIMER.sleep(100).then(() => {
                resolved = true;
            });

            // Act + Assert: still pending before the delay
            await vi.advanceTimersByTimeAsync(50);
            expect(resolved).toBe(false);

            // Act + Assert: resolved after the delay
            await vi.advanceTimersByTimeAsync(50);
            await promise;
            expect(resolved).toBe(true);
        });
    });

    describe('sleepSync', () => {
        it('blocks synchronously via `Atomics.wait` for the requested delay', () => {
            // Arrange: `Atomics.wait` is not affected by fake timers, so spy on it instead of
            // actually blocking the test thread.
            const waitSpy = vi.spyOn(Atomics, 'wait').mockReturnValue('timed-out');

            try {
                // Act
                TIMER.sleepSync(100);

                // Assert
                expect(waitSpy).toHaveBeenCalledTimes(1);
                expect(waitSpy).toHaveBeenCalledWith(expect.any(Int32Array), 0, 0, 100);
            } finally {
                waitSpy.mockRestore();
            }
        });
    });

    describe('timeout', () => {
        it('fires the callback after the requested delay', () => {
            // Arrange
            const callback = vi.fn();

            // Act
            TIMER.timeout(callback, 100);
            vi.advanceTimersByTime(99);
            expect(callback).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);

            // Assert
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('passes a canceller to the callback', () => {
            // Arrange
            let receivedCanceller: (() => void) | undefined;

            // Act
            TIMER.timeout((canceller) => {
                receivedCanceller = canceller;
            }, 10);
            vi.advanceTimersByTime(10);

            // Assert
            expect(receivedCanceller).toBeTypeOf('function');
        });

        it('does not fire when cancelled before the delay elapses', () => {
            // Arrange
            const callback = vi.fn();

            // Act
            const cancel = TIMER.timeout(callback, 100);
            cancel();
            vi.advanceTimersByTime(200);

            // Assert
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('repeat', () => {
        it('invokes the callback once per interval', () => {
            // Arrange
            const callback = vi.fn();

            // Act
            const cancel = TIMER.repeat(callback, 50, 'after-interval');
            vi.advanceTimersByTime(150);
            cancel();

            // Assert
            expect(callback).toHaveBeenCalledTimes(3);
        });

        it('invokes the callback immediately when `firstCall` is `now`', () => {
            // Arrange
            const callback = vi.fn();

            // Act
            const cancel = TIMER.repeat(callback, 50, 'now');

            // Assert: callback fired synchronously
            expect(callback).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(150);
            cancel();
            expect(callback).toHaveBeenCalledTimes(4);
        });

        it('stops invoking the callback after cancellation', () => {
            // Arrange
            const callback = vi.fn();

            // Act
            const cancel = TIMER.repeat(callback, 50, 'after-interval');
            vi.advanceTimersByTime(150);
            cancel();
            vi.advanceTimersByTime(500);

            // Assert
            expect(callback).toHaveBeenCalledTimes(3);
        });
    });

    describe('waitFor', () => {
        it('resolves with the event result when it resolves before the timeout', async () => {
            // Arrange
            const event = Promise.resolve('done');

            // Act + Assert
            await expect(TIMER.waitFor(event, 1000)).resolves.toBe('done');
        });

        it('rejects with a `TimeoutError` when the timeout elapses before the event resolves', async () => {
            // Arrange
            const event = new Promise<string>(() => {
                // Never resolves.
            });
            const race = TIMER.waitFor(event, 200);
            // Pre-attach the rejection handler so the rejection doesn't get reported as
            // unhandled when the inner `.then(throw)` settles before the outer awaiter runs.
            const assertion = expect(race).rejects.toBeInstanceOf(TimeoutError);

            // Act
            await vi.advanceTimersByTimeAsync(200);

            // Assert
            await assertion;
        });
    });

    describe('debounce', () => {
        it('only invokes the underlying function once per quiet period', () => {
            // Arrange
            const func = vi.fn();
            const debounced = TIMER.debounce(func, 100);

            // Act
            debounced('a');
            vi.advanceTimersByTime(50);
            debounced('b');
            vi.advanceTimersByTime(50);
            debounced('c');
            vi.advanceTimersByTime(100);

            // Assert: only the latest call survives the quiet period
            expect(func).toHaveBeenCalledTimes(1);
            expect(func).toHaveBeenCalledWith('c');
        });

        it('invokes the underlying function once when `resetOnUpdate` is false', () => {
            // Arrange
            const func = vi.fn();
            const debounced = TIMER.debounce(func, 100, false);

            // Act: in `resetOnUpdate=false` mode the timer starts on the first call and does
            // *not* extend on subsequent calls.
            debounced('a');
            vi.advanceTimersByTime(50);
            debounced('b');
            vi.advanceTimersByTime(50);

            // Assert: fires 100ms after the first call, using the latest args.
            expect(func).toHaveBeenCalledTimes(1);
            expect(func).toHaveBeenCalledWith('b');
        });
    });

    describe('debounceWithDistinctArgs', () => {
        it('invokes the function once per distinct key after the quiet period', () => {
            // Arrange
            const func = vi.fn<(value: number) => void>();
            const debounced = TIMER.debounceWithDistinctArgs(
                func,
                100,
                (value) => `${value}`,
                false,
            );

            // Act
            debounced(1);
            debounced(1);
            debounced(2);
            vi.advanceTimersByTime(100);

            // Assert
            expect(func).toHaveBeenCalledTimes(2);
            expect(func).toHaveBeenCalledWith(1);
            expect(func).toHaveBeenCalledWith(2);
        });

        it('resets the timer on each call when `resetOnUpdate` is true (the default)', () => {
            // Arrange
            const func = vi.fn<(value: number) => void>();
            const debounced = TIMER.debounceWithDistinctArgs(func, 100, (value) => `${value}`);

            // Act
            debounced(1);
            vi.advanceTimersByTime(50);
            debounced(2);
            vi.advanceTimersByTime(50);

            // Assert: still not fired because each call reset the timer
            expect(func).not.toHaveBeenCalled();

            // Act + Assert: now the quiet period has elapsed
            vi.advanceTimersByTime(50);
            expect(func).toHaveBeenCalledTimes(2);
        });
    });
});
