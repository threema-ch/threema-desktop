import {setAssertFailLogger} from '@threema/ts-utils/logging/assert-fail-logger';
import {assert} from '@threema/ts-utils/meta/assert';
import {assertError} from '@threema/ts-utils/meta/assert-error';
import {assertUnreachable} from '@threema/ts-utils/meta/assert-unreachable';
import {unreachable} from '@threema/ts-utils/meta/unreachable';
import {unwrap} from '@threema/ts-utils/meta/unwrap';

// Note: These helpers were moved to `@threema/ts-utils`. They are re-exported here to keep the
// existing import sites working.
//
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports.
export {assert, assertError, assertUnreachable, setAssertFailLogger, unreachable, unwrap};

/**
 * Like {@link assert}, but only run if we're in debug mode.
 */
export function debugAssert(condition: boolean, message?: string): asserts condition {
    if (import.meta.env.DEBUG) {
        assert(condition, message);
    }
}

/**
 * Ensure that something is ruled out (`never`) in the type system. Is a no-op at runtime.
 *
 * Use this in reachable places where exhaustive matching should happen, e.g. a default arm of a
 * switch/case with an unknown input value casted to a more specific value. Concretely:
 *
 *     const maybeSomeEnum = value as SomeEnum;
 *     switch (maybeSomeEnum) {
 *         [...]
 *         default:
 *             return exhausted(maybeSomeEnum, SomeEnum.FALLBACK)
 *     }
 */
export function exhausted(value: never): void;
export function exhausted<T>(value: never, fallback: T): T;
export function exhausted<T>(value: never, fallback?: T): T {
    // Note: Ugly cast but it fits the above two signatures, so it's alright.
    return fallback as unknown as T;
}

/**
 * Typeguard to ensure that a value is not undefined.
 */
export function isNotUndefined<T>(val: T | undefined): val is T {
    return val !== undefined;
}

/**
 * Typeguard for an undefined value.
 */
function isUndefined<T>(val: T | undefined): val is undefined {
    return val === undefined;
}

/*
 * Ensure value is undefined.
 */
export function ensureUndefined(val: unknown): undefined {
    if (!isUndefined(val)) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        throw new Error(`Value ${val} is not undefined`);
    }
    return val;
}
