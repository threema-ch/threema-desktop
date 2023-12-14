/*
 * Svelte Action to monitor mutations of an element and/or its descendants. Uses the
 * `MutationObserver` API.
 */

import type {ActionReturn} from 'svelte/action';

import {group} from '~/common/utils/array';

/**
 * The data that is sent as the `detail` of the {@link CustomEvent}.
 */
interface MutationEventDetail {
    readonly mutations: MutationRecord[];
}

/**
 * Additional properties that will be accepted on the `use:mutation` action, regardless of the
 * chosen type.
 */
interface MutationActionProperties {
    /** Whether observation is enabled. */
    readonly enabled?: boolean;
    /**
     * Options to pass to the {@link MutationObserver}.
     */
    readonly options?: MutationObserverInit;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:mutation`
 * action.
 */
interface MutationActionAttributes {
    /* eslint-disable @typescript-eslint/naming-convention */
    readonly 'on:mutation'?: (event: CustomEvent<MutationEventDetail>) => void;
    /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Dispatches `mutation` events on the respective target element when the {@link MutationObserver}
 * detects a change.
 */
function handleMutationChanges(mutations: MutationRecord[]): void {
    const mutationRecordsByNode = group(Array.from(mutations.values()), (record) => record.target);

    for (const [node, records] of mutationRecordsByNode.entries()) {
        node.dispatchEvent(
            new CustomEvent<MutationEventDetail>('mutation', {
                detail: {mutations: records},
            }),
        );
    }
}

/**
 * Starts observing an element using an existing or newly created {@link MutationObserver}.
 *
 * @returns A function to stop observation of the element.
 */
function observe(element: Element, options: MutationObserverInit): () => void {
    const observer = new MutationObserver(handleMutationChanges);

    observer.observe(element, options);

    return () => {
        observer.disconnect();
    };
}

/**
 * A Svelte Action that tracks mutation of a target element (using the {@link MutationObserver} API)
 * and emits mutation events.
 */
export function mutation(
    element: Element,
    {enabled: initialEnabled = true, options: initialOptions}: MutationActionProperties,
): ActionReturn<MutationActionProperties, MutationActionAttributes> {
    let unobserve = initialEnabled ? observe(element, initialOptions ?? {}) : undefined;

    function update({enabled = true, options}: MutationActionProperties): void {
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
