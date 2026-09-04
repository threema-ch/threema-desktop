import type {f64} from '@threema/ts-utils/float/f64';

/**
 * How many device pixels the machine draws per CSS pixel.
 *
 * Note: Changes when the user zooms the app, and when the window moves to a display with a
 * different scaling factor.
 */
export function getDevicePixelRatio(): f64 {
    return window.devicePixelRatio;
}

/**
 * Calls {@link listener} whenever {@link getDevicePixelRatio} changed.
 *
 * @param listener Called after the ratio changed.
 * @returns A function which cancels the subscription.
 */
export function subscribeToDevicePixelRatio(listener: () => void): () => void {
    let query: MediaQueryList | undefined = undefined;

    // A media query for the ratio which is current right now: It stops matching the moment the
    // ratio changes. Because it will then never match again, a fresh query for the new ratio has to
    // take its place each time.
    function watch(): void {
        query?.removeEventListener('change', handleChange);
        query = window.matchMedia(`(resolution: ${getDevicePixelRatio()}dppx)`);
        query.addEventListener('change', handleChange);
    }

    function handleChange(): void {
        watch();
        listener();
    }

    watch();

    return () => {
        query?.removeEventListener('change', handleChange);
        query = undefined;
    };
}
