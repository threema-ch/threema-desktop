import type {Dimensions, u53} from '~/common/types';
import {assertUnreachable, unreachable} from '~/common/utils/assert';

export type Orientation = 'none' | 'horizontal' | 'vertical';

export interface Constraints {
    /**
     * Minimum size. Note: must be smaller than `max` size in every dimension.
     */
    readonly min: Dimensions & {
        /**
         * Minimum total number of pixels in the image. Note: Only has an effect if it would make
         * the image larger than the given concrete `width` and `height` values.
         */
        readonly size?: u53;
    };
    /**
     * Maximum size. Note: must be larger than `min` size in every dimension.
     */
    readonly max: Dimensions & {
        /**
         * Maximum total number of pixels in the image. Note: Only has an effect if it would make
         * the image smaller than the given concrete `width` and `height` values.
         */
        readonly size?: u53;
    };
}

export interface ImageDisplayProposal {
    /**
     * Optimal size to display the image with, given its constraints.
     */
    readonly constrainedSize: Dimensions;
    /**
     * Whether `constrainedSize` has an equal aspect ratio compared to the image's natural size.
     */
    readonly isAspectRatioObeyed: boolean;
    /**
     * Orientation of `constrainedSize`.
     */
    readonly orientation: 'horizontal' | 'vertical' | 'none';
}

/**
 * Calculate the measurements a given image should be displayed with, provided some constraints.
 *
 * @param naturalDimensions Known natural dimensions to calculate the aspect ratio.
 * @param constraints Constraints to size the image with.
 * @returns Proposal for optimal display of the image.
 */
export function getConstrainedImageDimensions({
    naturalDimensions,
    constraints,
}: {
    readonly naturalDimensions: Dimensions;
    readonly constraints: Constraints;
}): ImageDisplayProposal {
    /*
     * First, just scale sequentially (scale down first, then up). Note: The scaled dimensions can
     * still violate the "max" constraints at this point.
     */
    let scaledDimensions = naturalDimensions;

    scaledDimensions = scaledDownToMaxWidth(scaledDimensions, constraints.max.width);
    scaledDimensions = scaledDownToMaxHeight(scaledDimensions, constraints.max.height);
    if (constraints.max.size !== undefined) {
        scaledDimensions = scaledDownToMaxSize(scaledDimensions, constraints.max.size);
    }

    scaledDimensions = scaledUpToMinWidth(scaledDimensions, constraints.min.width);
    scaledDimensions = scaledUpToMinHeight(scaledDimensions, constraints.min.height);
    if (constraints.min.size !== undefined) {
        scaledDimensions = scaledUpToMinSize(scaledDimensions, constraints.min.size);
    }

    /*
     * Check if the scaled dimensions still violate the constraints, and crop if necessary.
     */
    const constraintViolationDimension = getConstraintViolationDimension({
        dimensions: scaledDimensions,
        constraints,
    });

    let constrainedSize;
    switch (constraintViolationDimension) {
        case 'none':
            constrainedSize = scaledDimensions;
            break;

        case 'width':
            constrainedSize = {
                width: constraints.max.width,
                height: scaledDimensions.height,
            };
            break;

        case 'height':
            constrainedSize = {
                width: scaledDimensions.width,
                height: constraints.max.height,
            };
            break;

        case 'both':
            // This should only be reachable if min size is larger than max size, which is pretty
            // nonsensical.
            return assertUnreachable(
                'Image constraints violated in both dimensions, even after resize',
            );

        default:
            unreachable(constraintViolationDimension);
    }

    return {
        constrainedSize,
        isAspectRatioObeyed: getAspectRatio(naturalDimensions) === getAspectRatio(constrainedSize),
        orientation: getOrientation(constrainedSize),
    };
}

function getAspectRatio(dimensions: Dimensions): u53 {
    return dimensions.width / dimensions.height;
}

/**
 * Given some `dimensions`, calculate the {@link Orientation} of a rectangle. Note: A square will
 * have an orientation of "none".
 *
 * @param dimensions The dimensions of the rectangle to calculate.
 * @returns The orientation of the rectangle.
 */
function getOrientation(dimensions: Dimensions): Orientation {
    if (dimensions.width === dimensions.height) {
        return 'none';
    } else if (dimensions.width > dimensions.height) {
        return 'horizontal';
    }
    return 'vertical';
}

/**
 * Given some {@link Dimensions} and some {@link Constraints}, calculate which constraints are
 * violated.
 *
 * @param naturalDimensions Natural dimensions of the rectangle.
 * @param constraints Constraints to compare against.
 * @returns In which directions the rectangle violates the constraints.
 */
function getConstraintViolationDimension({
    dimensions,
    constraints,
}: {
    readonly dimensions: Dimensions;
    readonly constraints: Constraints;
}): 'width' | 'height' | 'both' | 'none' {
    const violatesWidth =
        dimensions.width < constraints.min.width || dimensions.width > constraints.max.width;
    const violatesHeight =
        dimensions.height < constraints.min.height || dimensions.height > constraints.max.height;

    if (violatesWidth && violatesHeight) {
        return 'both';
    } else if (violatesWidth) {
        return 'width';
    } else if (violatesHeight) {
        return 'height';
    }
    return 'none';
}

/**
 * Scales down the given {@link Dimensions} if they exceed `maxWidth`, else returns the original
 * dimensions.
 */
function scaledDownToMaxWidth(
    dimensions: Dimensions,
    maxWidth: Dimensions['width'] = Number.MAX_SAFE_INTEGER,
): Dimensions {
    if (dimensions.width > maxWidth) {
        return {
            width: maxWidth,
            height: maxWidth / getAspectRatio(dimensions),
        };
    }

    return dimensions;
}

/**
 * Scales down the given {@link Dimensions} if they exceed `maxHeight`, else returns the original
 * dimensions.
 */
function scaledDownToMaxHeight(
    dimensions: Dimensions,
    maxHeight: Dimensions['height'],
): Dimensions {
    if (dimensions.height > maxHeight) {
        return {
            height: maxHeight,
            width: maxHeight * getAspectRatio(dimensions),
        };
    }

    return dimensions;
}

/**
 * Scales down the given {@link Dimensions} if they exceed `maxSize`, else returns the original
 * dimensions.
 */
function scaledDownToMaxSize(dimensions: Dimensions, maxSize: u53): Dimensions {
    const aspectRatio = getAspectRatio(dimensions);

    if (dimensions.width * dimensions.height > maxSize) {
        const scaledHeight = Math.floor(Math.sqrt(maxSize / aspectRatio));
        const scaledWidth = aspectRatio * scaledHeight;

        return {
            width: scaledWidth,
            height: scaledHeight,
        };
    }

    return dimensions;
}

/**
 * Scales up the given {@link Dimensions} if they are smaller than `minWidth`, else returns the
 * original dimensions.
 */
function scaledUpToMinWidth(dimensions: Dimensions, minWidth: Dimensions['width'] = 0): Dimensions {
    if (dimensions.width < minWidth) {
        return {
            width: minWidth,
            height: minWidth / getAspectRatio(dimensions),
        };
    }

    return dimensions;
}

/**
 * Scales up the given {@link Dimensions} if they are smaller than `minHeight`, else returns the
 * original dimensions.
 */
function scaledUpToMinHeight(dimensions: Dimensions, minHeight: Dimensions['height']): Dimensions {
    if (dimensions.height < minHeight) {
        return {
            height: minHeight,
            width: minHeight * getAspectRatio(dimensions),
        };
    }

    return dimensions;
}

/**
 * Scales up the given {@link Dimensions} if they are below `minSize`, else returns the original
 * dimensions.
 */
function scaledUpToMinSize(dimensions: Dimensions, minSize: u53): Dimensions {
    const aspectRatio = getAspectRatio(dimensions);

    if (dimensions.width * dimensions.height < minSize) {
        const scaledheight = Math.sqrt(minSize / aspectRatio);
        const scaledWidth = aspectRatio * scaledheight;

        return {
            width: scaledWidth,
            height: scaledheight,
        };
    }

    return dimensions;
}
