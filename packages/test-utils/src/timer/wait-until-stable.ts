import type {u53} from '@threema/ts-utils/integer/u53';
import {TIMER} from '@threema/ts-utils/timer/global-timer';

/**
 * Time to wait between checks of the condition.
 */
const INTERVAL_MS = 100;

/**
 * How many checks in a row have to hold before the condition counts as settled.
 */
const STABLE_INTERVALS = 3;

/**
 * Waits until the given condition holds, and stays static for {@link STABLE_INTERVALS} consecutive
 * turns.
 *
 * @param isDone The condition, called after each interval.
 * @param timeoutMs Maximum duration to wait for the condition to settle. Defaults to `4000`.
 * @throws {Error} If the condition did not settle within `timeoutMs`.
 */
export async function waitUntilStable(isDone: () => boolean, timeoutMs: u53 = 4000): Promise<void> {
    const intervals = Math.floor(timeoutMs / INTERVAL_MS);
    let stable = 0;
    for (let interval = 0; interval < intervals; interval++) {
        await TIMER.sleep(INTERVAL_MS);
        stable = isDone() ? stable + 1 : 0;
        if (stable >= STABLE_INTERVALS) {
            return;
        }
    }
    throw new Error(`The condition did not settle within ${timeoutMs}ms`);
}
