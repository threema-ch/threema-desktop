import type {u53} from '@threema/ts-utils/integer/u53';
import {TIMER} from '@threema/ts-utils/timer/global-timer';

/**
 * Time to wait between checks of the condition.
 */
const INTERVAL_MS = 100;

/**
 * The collection is requested after the first interval, so a timeout below two intervals leaves no
 * time for a `FinalizationRegistry` to report and the check will not see anything.
 */
const MIN_TIMEOUT_MS = 200;

/**
 * Requests a garbage collection and waits until the given condition holds, or until the timeout is
 * reached. Usually used in conjunction with a {@link FinalizationRegistry} to check if a certain
 * object has been collected.
 *
 * Note: The consuming package needs to configure the test environment to be launched using the
 * `--expose-gc` flag, as this helper only works if the `globalThis.gc` V8 extension is enabled. The
 * helper does not work at all in environments which are not based on V8.
 *
 * @param isDone The callback called after each interval.
 * @param timeoutMs Maximum duration to wait for the `isDone` condition to hold before giving up.
 *   Must be at least `200`. Defaults to `4000`.
 * @throws {Error} If the runtime was not launched with garbage collection exposed or the given
 *   `timeoutMs` is too low.
 */
export async function waitForGc(isDone: () => boolean, timeoutMs: u53 = 4000): Promise<void> {
    if (timeoutMs < MIN_TIMEOUT_MS) {
        throw new Error(`Expected 'timeoutMs' to be at least '${MIN_TIMEOUT_MS}'`);
    }

    const collect = (globalThis as {gc?: () => void}).gc;
    if (collect === undefined) {
        throw new Error(
            "Expected garbage collection to be exposed, e.g. the runtime to be launched with '--expose-gc' (Node) or '--js-flags=--expose-gc' (Chromium, Electron)",
        );
    }

    // Yield before collecting. The references the caller has just dropped are still reachable from
    // the task it dropped them in, so a collection which runs in that same turn would find the
    // objects alive, which is not what we want.
    await TIMER.sleep(INTERVAL_MS);
    collect();

    // The yield above is part of the budget.
    const remainingMs = timeoutMs - INTERVAL_MS;
    const intervals = Math.floor(remainingMs / INTERVAL_MS);
    const remainderMs = remainingMs % INTERVAL_MS;

    for (let interval = 0; interval < intervals; interval++) {
        await TIMER.sleep(INTERVAL_MS);
        if (isDone()) {
            return;
        }
    }

    if (remainderMs > 0) {
        await TIMER.sleep(remainderMs);
        // Result is not used because we return anyway after this.
        isDone();
    }
}
