import {type Logger} from '~/common/logging';
import {type Dimensions, type f64, type u53} from '~/common/types';
import {debugAssert, unwrap} from '~/common/utils/assert';
import {isSupportedImageType} from '~/common/utils/image';

/**
 * Return the dimensions of the specified image blob (or undefined if dimensions could not be
 * determined).
 */
export async function getImageDimensions(image: Blob): Promise<Dimensions | undefined> {
    // Create image bitmap and wait for it to load
    try {
        const bitmap = await createImageBitmap(image);
        const dimensions = {width: bitmap.width, height: bitmap.height};
        bitmap.close();
        return dimensions;
    } catch (error) {
        return undefined;
    }
}

/**
 * Resize the specified image. Return it, along with the original and resized dimensions of the
 * image.
 *
 * If the image is smaller than the specified {@link maxSize}, then the dimensions will remain
 * unchanged. (But the image is always re-encoded.)
 *
 * All metadata of the image will be removed.
 *
 * @param file The file to be resized. Must have a supported image media type, otherwise an error is
 *   thrown.
 * @param outputMediaType The desired media type of the resized image.
 * @param maxSize The max side length of the image.
 * @param quality The output quality (0.0 for lowest quality, 1.0 for highest quality). Will only be
 *   used for JPEG images.
 * @param logger An optional logger instance
 * @returns resized image and dimensions, or `undefined` if something went wrong
 * @throws {@link Error} If file media type does not start with `image/`
 */
export async function downsizeImage(
    file: File,
    outputMediaType: string,
    maxSize: u53,
    quality: f64,
    log?: Logger,
): Promise<
    {resized: Blob; originalDimensions: Dimensions; resizedDimensions: Dimensions} | undefined
> {
    // Check if file is a supported image
    if (!isSupportedImageType(file.type)) {
        throw new Error(`Cannot generate thumbnail for file of type ${file.type}`);
    }

    // Create image bitmap and wait for it to load
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch (error) {
        log?.warn(`Could not load bitmap: ${error}`);
        return undefined;
    }

    // Extract original dimensions
    const originalDimensions = {width: bitmap.width, height: bitmap.height};

    // Downscale image to desired size
    //
    // Note: The OffscreenCanvas type has a Promise based API, in contrast to the callback-based
    //       Canvas API. Thus the `transferControlToOffscreen` call.
    const canvas = document.createElement('canvas').transferControlToOffscreen();
    const ctx = unwrap(canvas.getContext('2d'), 'Canvas 2D context is undefined');
    const scaleFactor = Math.min(
        maxSize / Math.max(originalDimensions.width, originalDimensions.height),
        1.0,
    );
    const resizedDimensions: Dimensions = {
        width: Math.round(originalDimensions.width * scaleFactor),
        height: Math.round(originalDimensions.height * scaleFactor),
    };
    debugAssert(
        resizedDimensions.width <= maxSize,
        `Resized image width ${canvas.width} is larger than max size of ${maxSize}`,
    );
    debugAssert(
        resizedDimensions.height <= maxSize,
        `Resized image height ${canvas.height} is larger than max size of ${maxSize}`,
    );
    canvas.width = resizedDimensions.width;
    canvas.height = resizedDimensions.height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Release bitmap
    bitmap.close();

    // Extract thumbnail data from canvas
    const resizedBlob = await canvas.convertToBlob({
        type: outputMediaType,
        quality, // Note: Ignored for PNGs
    });
    log?.debug(
        `Resized image: ${resizedBlob.type}, dimensions=${canvas.width}x${
            canvas.height
        }, ${Math.floor(resizedBlob.size / 1024)} KiB`,
    );
    return {resized: resizedBlob, originalDimensions, resizedDimensions};
}
