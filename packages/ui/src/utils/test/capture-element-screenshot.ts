import {ensureArrayBufferBackedView} from '@threema/ts-utils/byte/array-buffer-backed-view';
import {base64ToU8a} from '@threema/ts-utils/conversion/base64-to-u8a';
import {assert} from '@threema/ts-utils/meta/assert';
import {page, type Locator} from 'vitest/browser';

/**
 * Capture the pixels the given element currently paints, for use in tests which assert on rendered
 * output.
 *
 * Note: The screenshot is not written to the file system. Elements which extend beyond the viewport
 * are captured in full.
 *
 * @param element The element to capture, either directly or as a {@link Locator}.
 * @param options.includeBackground Whether to capture the element on top of the page background. If
 *   `false`, the background is transparent, i.e. areas the element does not paint (e.g. because
 *   they are masked out) are transparent as well. Defaults to `false`.
 * @returns The captured pixels, one per CSS pixel of the element.
 * @throws {Error} if the captured pixels do not correspond to the element's CSS pixels.
 */
export async function captureElementScreenshot(
    element: Element | Locator,
    options: {readonly includeBackground?: boolean} = {},
): Promise<ImageData> {
    const base64 = await page.screenshot({
        element,
        // Freeze CSS animations and transitions, so repeated captures are deterministic.
        animations: 'disabled',
        omitBackground: !(options.includeBackground ?? false),
        // Return the screenshot base64-encoded, instead of writing it to the file system.
        save: false,
        // Capture one pixel per CSS pixel of the page, so that the result does not depend on the
        // display's device pixel ratio.
        scale: 'css',
        // Required for a transparent background, and lossless (unlike `jpeg`).
        type: 'png',
    });

    const bitmap = await createImageBitmap(
        new Blob([ensureArrayBufferBackedView(base64ToU8a(base64))], {type: 'image/png'}),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    assert(context !== null, 'Expected to acquire a 2d rendering context from the OffscreenCanvas');
    context.drawImage(bitmap, 0, 0);

    // Note: Read the element's size only now, because capturing the screenshot fast-forwards
    // animations, which might have changed the layout.
    const {height, width} =
        element instanceof Element
            ? element.getBoundingClientRect()
            : element.element().getBoundingClientRect();

    // A screenshot which does not correspond to the element's CSS pixels cannot be reasoned about
    // in terms of the layout, so fail instead of returning misleading pixels. Allow for a rounding
    // difference of one pixel, because elements may be sized fractionally.
    assert(
        Math.abs(bitmap.width - width) <= 1 && Math.abs(bitmap.height - height) <= 1,
        `Expected the screenshot (${bitmap.width}x${bitmap.height}) to match the element's CSS size (${width}x${height}). Is Vitest scaling the tester iframe down to fit the browser window (see \`VIEWPORT\` in \`vitest.config.ts\`)?`,
    );

    return context.getImageData(0, 0, bitmap.width, bitmap.height);
}
