import {isFullyVisibleVertical} from '~/app/ui/utils/element';
import type {u53} from '~/common/types';

/**
 * Scroll an {@link Element} into the visible area of `container`, if it is not already fully
 * visible.
 *
 * @returns A `Promise` that resolves when scrolling ends, or rejects if scrolling to the element
 *   was unsuccessful (e.g., an element didn't exist or the timeout was reached).
 */
export async function scrollIntoViewIfNeededAsync({
    container,
    element,
    options,
    timeoutMs = 3000,
}: {
    /* eslint-disable @typescript-eslint/ban-types */
    container: Element | null | undefined;
    element: Element | null | undefined;
    options?: ScrollIntoViewOptions;
    /**
     * The maximum duration to wait for the element to appear in the viewport before considering the
     * scroll failed. Defaults to `3000` milliseconds.
     */
    timeoutMs?: u53;
    /* eslint-enable @typescript-eslint/ban-types */
}): Promise<void> {
    if (isFullyVisibleVertical({container, element})) {
        return await Promise.resolve();
    }

    return await scrollIntoViewAsync({
        container,
        element,
        options,
        timeoutMs,
    });
}

/**
 * Scroll an {@link Element} into the visible area of `container`.
 *
 * @returns A `Promise` that resolves when scrolling ends, or rejects if scrolling to the element
 *   was unsuccessful (e.g., an element didn't exist or the timeout was reached).
 */
async function scrollIntoViewAsync({
    container,
    element,
    options,
    timeoutMs = 3000,
}: {
    /* eslint-disable @typescript-eslint/ban-types */
    container: Element | null | undefined;
    element: Element | null | undefined;
    options?: ScrollIntoViewOptions;
    /**
     * The maximum duration to wait for the element to appear in the viewport before considering the
     * scroll failed. Defaults to `3000` milliseconds.
     */
    timeoutMs?: u53;
    /* eslint-enable @typescript-eslint/ban-types */
}): Promise<void> {
    return await new Promise((resolve, reject) => {
        let timeoutId: u53 | undefined = undefined;

        if (container === null || container === undefined) {
            reject(new Error('scrollIntoViewAsync: Scroll container was undefined'));
            return;
        }
        if (element === null || element === undefined) {
            reject(new Error('scrollIntoViewAsync: Target element was undefined'));
            return;
        }

        function handleScrollEnd(): void {
            clearTimeout(timeoutId);
            container?.removeEventListener('scrollend', handleScrollEnd);

            resolve();
        }
        container.addEventListener('scrollend', handleScrollEnd);

        // `scrollIntoView` currently has various issues in chromium, which seems to improve when
        // first waiting for the next tick before scrolling.
        //
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1121151
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1043933
        // https://bugs.chromium.org/p/chromium/issues/detail?id=833617
        window.requestAnimationFrame(() => element.scrollIntoView(options));

        timeoutId = window.setTimeout(() => {
            container.removeEventListener('scrollend', handleScrollEnd);
            reject(
                new Error('scrollIntoViewAsync: Maximum wait time for scrollend event exceeded'),
            );
        }, timeoutMs);
    });
}
