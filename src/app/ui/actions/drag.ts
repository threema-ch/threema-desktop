/*
 * Svelte Action to monitor if a dragged element has entered or exited the element the action is
 * attached to (i.e., the drop target).
 */

import type {ActionReturn} from 'svelte/action';

/**
 * Additional properties that will be accepted on the `use:safedrag` action, regardless of the
 * chosen type.
 */
interface SafeDragActionProperties {
    /** Whether observation is enabled. */
    readonly enabled?: boolean;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:safedrag`
 * action.
 */
interface SafeDragActionAttributes {
    /* eslint-disable @typescript-eslint/naming-convention */
    readonly 'on:safedragenter'?: (event: DragEvent) => void;
    readonly 'on:safedragleave'?: (event: DragEvent) => void;
    /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Starts observing an element using event listeners.
 *
 * @returns A function to stop observation of the element, i.e., clean up event listeners.
 */
function observe(element: HTMLElement): () => void {
    let entered = 0;

    function handleDragEnter(event: DragEvent): void {
        if (entered++ === 0) {
            element.dispatchEvent(new DragEvent('safedragenter', event));
        }
    }

    function handleDragLeave(event: DragEvent): void {
        if (--entered === 0) {
            element.dispatchEvent(new DragEvent('safedragleave', event));
        }
    }

    function handleDrop(event: DragEvent): void {
        entered = 0;

        element.dispatchEvent(new DragEvent('safedragleave', event));
    }

    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
        element.removeEventListener('dragenter', handleDragEnter);
        element.removeEventListener('dragleave', handleDragLeave);
        element.removeEventListener('drop', handleDrop);
    };
}

/**
 * A Svelte Action that monitors if a dragged element has entered or exited the element the action
 * is attached to (i.e., the drop target), and dispatches corresponding `safedragenter` and
 * `safedragleave` events. Aims to be more robust than the native `dragenter` and `dragleave`
 * events, which sometimes fire multiple times.
 */
export function safedrag(
    element: HTMLElement,
    {enabled: initialEnabled = true}: SafeDragActionProperties = {},
): ActionReturn<SafeDragActionProperties, SafeDragActionAttributes> {
    let unobserve = initialEnabled ? observe(element) : undefined;

    function update({enabled = true}: SafeDragActionProperties): void {
        if (enabled) {
            unobserve?.();
            unobserve = observe(element);
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
