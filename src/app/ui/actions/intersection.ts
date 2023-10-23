/*
 * Svelte Action to monitor if two elements are intersecting.
 */

import type {ActionReturn} from 'svelte/action';

/**
 * The data that is sent as the `detail` of the {@link CustomEvent}.
 */
interface IntersectionEventDetail {
    readonly entry: IntersectionObserverEntry;
}

/**
 * Additional properties that will be accepted on the `use:intersection` action, regardless of the
 * chosen type.
 */
interface IntersectionActionProperties {
    /** Whether observation is enabled. */
    readonly enabled?: boolean;
    /**
     * Options to pass to the {@link IntersectionObserver}.
     */
    readonly options?: IntersectionObserverInit;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:intersection`
 * action.
 */
interface IntersectionActionAttributes {
    /* eslint-disable @typescript-eslint/naming-convention */
    readonly 'on:intersectionenter'?: (event: CustomEvent<IntersectionEventDetail>) => void;
    readonly 'on:intersectionexit'?: (event: CustomEvent<IntersectionEventDetail>) => void;
    /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Map to store a single {@link IntersectionObserver} per options object, so that if the object is
 * the same, an existing observer is reused.
 */
const observers = new WeakMap<IntersectionObserverInit, IntersectionObserver>();

/**
 * Dispatches `intersectionenter` and `intersectionexit` events on the respective target element
 * when the {@link IntersectionObserver} detects a change. Used as the callback for an
 * `IntersectionObserver`.
 */
function handleIntersectionChanges(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries.values()) {
        if (entry.isIntersecting) {
            entry.target.dispatchEvent(
                new CustomEvent<IntersectionEventDetail>('intersectionenter', {
                    detail: {entry},
                }),
            );
        } else {
            entry.target.dispatchEvent(
                new CustomEvent<IntersectionEventDetail>('intersectionexit', {
                    detail: {entry},
                }),
            );
        }
    }
}

/**
 * Creates a new {@link IntersectionObserver} and adds it to the `observers` map.
 */
function createObserver(options: IntersectionObserverInit): IntersectionObserver {
    const observer = new IntersectionObserver(handleIntersectionChanges, options);
    observers.set(options, observer);
    return observer;
}

/**
 * Starts observing an element using an existing or newly created {@link IntersectionObserver}.
 *
 * @returns A function to stop observation of the element.
 */
function observe(element: Element, options: IntersectionObserverInit): () => void {
    const observer = observers.get(options) ?? createObserver(options);
    observer.observe(element);

    return () => {
        observer.unobserve(element);
    };
}

/**
 * A Svelte Action that tracks intersection of a target element (using the
 * {@link IntersectionObserver} API) and emits intersection events.
 *
 * Note: If multiple elements use the same reference to an `options` object, they will share the
 * same `IntersectionObserver` for improved performance. When the `options` object is garbage
 * collected, the `IntersectionObserver` will be collected as well.
 */
export function intersection(
    element: Element,
    {enabled: initialEnabled = true, options: initialOptions}: IntersectionActionProperties,
): ActionReturn<IntersectionActionProperties, IntersectionActionAttributes> {
    let unobserve = initialEnabled ? observe(element, initialOptions ?? {}) : undefined;

    function update({enabled = true, options}: IntersectionActionProperties): void {
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
