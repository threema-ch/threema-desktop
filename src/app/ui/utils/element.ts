import type {u53} from '~/common/types';
import {TIMER} from '~/common/utils/timer';

/**
 * Returns whether the {@link DOMRect} of `element` is entirely contained within the {@link DOMRect}
 * of `container`, e.g. if `container` is scrollable and `element` is entirely visible in the
 * current viewport.
 */
export function isFullyVisibleVertical({
    container,
    element,
}: {
    /* eslint-disable @typescript-eslint/ban-types */
    container: Element | null | undefined;
    element: Element | null | undefined;
    /* eslint-enable @typescript-eslint/ban-types */
}): boolean {
    if (
        container === null ||
        container === undefined ||
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        element === null ||
        element === undefined
    ) {
        return false;
    }

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Because `DOMRect` values are doubles, accept imprecisions of 1 pixel.
    return (
        elementRect.top >= containerRect.top - 1 && elementRect.bottom <= containerRect.bottom + 1
    );
}

/**
 * Wait for an {@link Element} to appear in the DOM.
 *
 * @returns A `Promise` that resolves with the found element, or rejects if the wait was
 *   unsuccessful (e.g., an element didn't exist or the timeout was reached).
 */
export async function waitForPresenceOfElement({
    container,
    selector,
    subtree = false,
    timeoutMs = 3000,
}: {
    /* eslint-disable @typescript-eslint/ban-types */
    /**
     * The container whose children to observe. Note: Only direct children are observed by default,
     * unless `subtree` is explicitly enabled.
     */
    container: Element | null | undefined;
    selector: string;
    /**
     * Set to true if mutations to not just container's children, but also container's descendants
     * (depth > 1) are to be observed. Defaults to `false`.
     */
    subtree?: boolean;
    /**
     * The maximum duration to wait for the element's presence before considering the observation
     * failed. Defaults to `3000` milliseconds.
     */
    timeoutMs?: u53;
    /* eslint-enable @typescript-eslint/ban-types */
}): Promise<Element> {
    // TODO(DESK-1338): Timer usage can be simplified a lot here.
    return await new Promise((resolve, reject) => {
        if (container === null || container === undefined) {
            reject(new Error('waitForPresenceOfElement: Container was undefined'));
            return;
        }

        // eslint-disable-next-line @typescript-eslint/ban-types
        let element: Element | null = container.querySelector(selector);
        if (element !== null) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            element = container.querySelector(selector);

            if (element !== null) {
                cancel();
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(container, {
            childList: true,
            subtree,
        });

        const cancel = TIMER.timeout(() => {
            observer.disconnect();
            reject(
                new Error(
                    'waitForPresenceOfElement: Maximum wait time for element presence exceeded',
                ),
            );
        }, timeoutMs);
    });
}
