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
 * Calculate the dimensions the thumbnail should be displayed with. Note: Only the height can be
 * constrained currently, and the width will be calculated from the aspect ratio.
 *
 * @param dimensions Known dimensions (either of the full-size image or the thumbnail itself).
 * @returns the dimensions the thumbnail should be displayed with.
 */
export function getExpectedDisplayDimensions({
    originalDimensions,
    constraints,
}: {
    readonly originalDimensions: Dimensions | undefined;
    readonly constraints: {
        min: Omit<Dimensions, 'width'>;
        max: Omit<Dimensions, 'width'>;
    };
}): Dimensions | undefined {
    // If no dimensions are known, the expected thumbnail size cannot be calculated.
    if (originalDimensions === undefined) {
        return undefined;
    }

    // Use full size image dimensions to determine aspect ratio.
    const aspectRatio = originalDimensions.width / originalDimensions.height;

    const thumbnailWidthAtMinHeight = constraints.min.height * aspectRatio;
    const thumbnailWidthAtMaxHeight = constraints.max.height * aspectRatio;

    // If the full size image is smaller than our minimum thumbnail render size, the actual
    // thumbnail will probably be smaller as well, which means we can just use our minimum size.
    if (originalDimensions.height <= constraints.min.height) {
        return {
            width: thumbnailWidthAtMinHeight,
            height: constraints.min.height,
        };
    }

    // If the full size image is larger than our maximum thumbnail render size, the actual thumbnail
    // will probably be larger as well, which means we can just use our maximum size.
    if (originalDimensions.height >= constraints.max.height) {
        return {
            width: thumbnailWidthAtMaxHeight,
            height: constraints.max.height,
        };
    }

    // In all other cases we use the original dimensions.
    return originalDimensions;
}
