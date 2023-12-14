/*
 * Svelte Action to monitor size changes of an element. Uses the `ResizeObserver` API.
 */

import type {ActionReturn} from 'svelte/action';

import {group} from '~/common/utils/array';

/**
 * The data that is sent as the `detail` of the {@link CustomEvent}.
 */
interface ResizeEventDetail {
    readonly entries: ResizeObserverEntry[];
}

/**
 * Additional properties that will be accepted on the `use:size` action, regardless of the
 * chosen type.
 */
interface ResizeActionProperties {
    /** Whether observation is enabled. */
    readonly enabled?: boolean;
    /**
     * Options to pass to the {@link ResizeObserver}.
     */
    readonly options?: ResizeObserverOptions;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:size`
 * action.
 */
interface ResizeActionAttributes {
    /* eslint-disable @typescript-eslint/naming-convention */
    readonly 'on:changesize'?: (event: CustomEvent<ResizeEventDetail>) => void;
    /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Reusable {@link ResizeObserver}.
 */
let observer: ResizeObserver | undefined;

/**
 * Dispatches `changesize` events on the respective target element when the {@link ResizeObserver}
 * detects a change. Used as the callback for a `ResizeObserver`.
 */
function handleResizeChanges(entries: ResizeObserverEntry[]): void {
    const entriesByNode = group(Array.from(entries.values()), (entry) => entry.target);

    for (const [node, observerEntries] of entriesByNode.entries()) {
        node.dispatchEvent(
            new CustomEvent<ResizeEventDetail>('changesize', {
                detail: {entries: observerEntries},
            }),
        );
    }
}

/**
 * Starts observing an element using an existing or newly created {@link ResizeObserver}.
 *
 * @returns A function to stop observation of the element.
 */
function observe(element: Element, options: ResizeObserverOptions): () => void {
    if (observer === undefined) {
        observer = new ResizeObserver(handleResizeChanges);
    }

    observer.observe(element, options);

    return () => {
        observer?.unobserve(element);
    };
}

/**
 * A Svelte Action that tracks the size of a target element (using the {@link ResizeObserver} API)
 * and emits resize events.
 *
 * Note: The same `ResizeObserver` will be shared for all usages of the action for improved
 * performance.
 */
export function size(
    element: Element,
    {enabled: initialEnabled = true, options: initialOptions}: ResizeActionProperties = {},
): ActionReturn<ResizeActionProperties, ResizeActionAttributes> {
    let unobserve = initialEnabled ? observe(element, initialOptions ?? {}) : undefined;

    function update({enabled = true, options}: ResizeActionProperties): void {
        if (enabled) {
            unobserve?.();
            unobserve = observe(element, options ?? {});
        } else {
            unobserve?.();
        }
    }

    function destroy(): void {
        unobserve?.();
    }

    return {
        update,
        destroy,
    };
}
