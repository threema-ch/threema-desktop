import {type Dimensions} from '~/common/types';

/**
 * Context menu selection events which may be dispatched by the message context menu.
 */
export type ConversationMessageContextMenuEvent =
    | 'thumbup'
    | 'thumbdown'
    | 'quote'
    | 'forward'
    | 'copy'
    | 'copyLink'
    | 'save'
    | 'showMessageDetails'
    | 'delete';

/**
 * Calculate the dimensions the thumbnail should be displayed with.
 *
 * @param dimensions Known dimensions (either of the full-size image or the thumbnail itself).
 * @returns the dimensions the thumbnail should be displayed with.
 */
export function getExpectedDisplayDimensions(
    dimensions: Dimensions | undefined,
): Dimensions | undefined {
    // If no dimensions are known, the expected thumbnail size cannot be calculated.
    if (dimensions === undefined) {
        return undefined;
    }

    // Use full size image dimensions to determine aspect ratio.
    const aspectRatio = dimensions.width / dimensions.height;

    // Thumbnail render defaults.
    const minThumbnailSize = 120;
    const maxThumbnailHeight = 250;

    const thumbnailWidthAtMinHeight = minThumbnailSize * aspectRatio;
    const thumbnailWidthAtMaxHeight = maxThumbnailHeight * aspectRatio;

    // If the full size image is smaller than our minimum thumbnail render size, the actual
    // thumbnail will probably be smaller as well, which means we can just use our minimum size.
    if (dimensions.height <= minThumbnailSize) {
        return {
            width: thumbnailWidthAtMinHeight,
            height: minThumbnailSize,
        };
    }

    // If the full size image is larger than our maximum thumbnail render size, the actual thumbnail
    // will probably be larger as well, which means we can just use our maximum size.
    if (dimensions.height >= maxThumbnailHeight) {
        return {
            width: thumbnailWidthAtMaxHeight,
            height: maxThumbnailHeight,
        };
    }

    // In all other cases we use the full size dimensions.
    return dimensions;
}
