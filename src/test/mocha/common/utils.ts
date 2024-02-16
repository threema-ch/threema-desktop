import {AssertionError, expect} from 'chai';

import type {u53} from '~/common/types';
import {byteView} from '~/common/utils/byte';
import {TIMER} from '~/common/utils/timer';

/**
 * Generate fake (non-)random values.
 */
export function fakeRandomBytes<T extends ArrayBufferView>(buffer: T): T {
    const array = byteView(Uint8Array, buffer);
    array.fill(0x3e);
    return buffer;
}

/**
 * Generate non-cryptographically secure random values.
 */
export function pseudoRandomBytes<T extends ArrayBufferView>(buffer: T): T {
    const array = byteView(Uint8Array, buffer);
    for (let offset = 0; offset < array.byteLength; ++offset) {
        array[offset] = Math.floor(Math.random() * 255);
    }
    return buffer;
}

/**
 * Return a date that represents the point in time n {@link seconds} ago.
 */
export function secondsAgo(seconds: u53): Date {
    const now = new Date();
    return new Date(now.getTime() - seconds * 1000);
}

/**
 * Helper to expect that a promise will be rejected.
 *
 * @param promise The promise that is expected to be rejected.
 * @param failureMessage An optional custom error message to show when the assertion fails.
 * @param errorConstructor An optional constructor of the error type. Defaults to {@link Error}.
 * @param errorMessage An optional error message string. If provided, it be asserted that an error is
 *   thrown with a message that contains that string.
 */
export async function expectRejectedWith<T extends Error>(
    promise: Promise<unknown>,
    failureMessage?: string,
    errorConstructor?: new () => T,
    errorMessage?: string,
): Promise<void> {
    try {
        await promise;
        expect.fail(failureMessage ?? 'promise should have thrown exception');
    } catch (error) {
        if (error instanceof AssertionError) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw error;
        }
        if (errorMessage === undefined) {
            expect(error).to.be.instanceOf(errorConstructor ?? Error);
        } else {
            expect(error)
                .to.be.instanceOf(errorConstructor ?? Error)
                .with.property('message', errorMessage);
        }
    }
}

/**
 * Wait for {@link condition} to return true. Re-test every {@link intervalMs}, up to
 * {@link waitTime}.
 */
export async function waitForCondition(
    condition: () => boolean,
    intervalMs = 5,
    waitTime = 100,
): Promise<boolean> {
    if (condition()) {
        return true;
    }
    const attempts = Math.ceil(waitTime / intervalMs);
    for (let i = 0; i < attempts; i++) {
        await TIMER.sleep(intervalMs);
        if (condition()) {
            return true;
        }
    }
    return false;
}

/**
 * Assert that {@link condition} is fulfilled (returns true) within {@link waitTime}.
 */
export async function expectCondition(
    condition: () => boolean,
    description: string,
    intervalMs = 5,
    waitTime = 100,
): Promise<void> {
    const conditionFulfilled = await waitForCondition(condition, intervalMs, waitTime);
    if (!conditionFulfilled) {
        expect.fail(`Condition "${description}" not fulfilled within ${waitTime} ms`);
    }
}
