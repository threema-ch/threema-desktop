import {createEventDispatcher} from 'svelte';

import {unreachable} from '~/common/utils/assert';

/**
 * Represents a nullable binding in Svelte. Note: This is a simple union type with `null`. The
 * reason this is necessary is because Svelte might set a binding to `null` if the referenced
 * element or component is not mounted.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type SvelteNullableBinding<T> = T | null;

/**
 * Wraps a function with additional dependencies, so that Svelte will re-evaluate it if any of the
 * given dependencies change.
 *
 * Note: Calls to this function must always be in a reactive block (`$: reactive(...)`).)
 */
export function reactive<TReturn>(fn: () => TReturn, dependencies: unknown[]): TReturn {
    return fn();
}

/**
 * Type compatible with a Svelte event `dispatcher` function returned by Svelte's
 * `createEventDispatcher`.
 */
export type SvelteEventDispatcher<EventMap extends Record<string, unknown>> = <
    Type extends keyof EventMap,
>(
    ...args: undefined extends EventMap[Type]
        ? [
              type: Type,
              parameter?: EventMap[Type] | undefined,
              options?: SvelteEventDispatcherOptions,
          ]
        : [type: Type, parameter: EventMap[Type], options?: SvelteEventDispatcherOptions]
) => boolean;

interface SvelteEventDispatcherOptions {
    cancelable?: boolean;
}

/**
 * Function that suspends a BufferedEventDispatcher.
 */
type SuspendFunction = () => void;

/**
 * Function that resumes a BufferedEventDispatcher.
 */
type ResumeFunction = (options?: {
    /**
     * Whether to re-send events that were suppressed while the `dispatcher` was suspended.
     * Defaults to `"none"`.
     */
    replay?: 'none' | 'all' | 'last';
}) => void;

/**
 * Creates an event dispatcher that is compatible with Svelte's component event dispatcher, but
 * extends it to be suspendable. Event dispatchers are functions that can take two arguments: `name`
 * and `detail`.
 *
 * During suspension, events will be collected and can optionally be re-sent when the dispatcher is
 * resumed.
 *
 * @returns A 3-tuple of: dispatch function, suspend function, and resume function.
 */
export function createBufferedEventDispatcher<EventMap extends Record<string, unknown>>(): [
    dispatcher: SvelteEventDispatcher<EventMap>,
    suspender: SuspendFunction,
    resumer: ResumeFunction,
] {
    const dispatch = createEventDispatcher<EventMap>();

    type EventKey = keyof EventMap;
    let bufferedEvents: [
        type: EventKey,
        parameter: EventMap[EventKey],
        options: SvelteEventDispatcherOptions | undefined,
    ][] = [];

    let isSuspended = false;

    return [
        // Dispatch function
        (...args) => {
            const type: EventKey = args[0];
            const parameter: EventMap[EventKey] = args[1] as EventMap[EventKey];
            const options: SvelteEventDispatcherOptions | undefined = args[2];

            if (isSuspended) {
                bufferedEvents.push([type, parameter, options]);
                return true;
            }

            return dispatch(type, parameter, options);
        },
        // Suspend function
        () => {
            isSuspended = true;
        },
        // Resume function
        ({replay = 'none'} = {}) => {
            isSuspended = false;

            // Re-send events that were buffered while the dispatcher was suspended and clear the
            // buffer.
            switch (replay) {
                case 'none':
                    // Don't re-send any events.
                    break;

                case 'all': {
                    bufferedEvents.forEach((event) => {
                        dispatch(event[0], event[1], event[2]);
                    });
                    break;
                }

                case 'last': {
                    const last = bufferedEvents.at(-1);
                    if (last !== undefined) {
                        dispatch(last[0], last[1], last[2]);
                    }
                    break;
                }

                default:
                    unreachable(replay);
            }

            // Reset buffered events.
            bufferedEvents = [];
        },
    ];
}
