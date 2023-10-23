import type {
    ConstrainedDimensions,
    Constraints,
    Orientation,
} from '~/app/ui/components/atoms/lazy-image/types';
import type {Dimensions, u53} from '~/common/types';
import {assertUnreachable, unreachable} from '~/common/utils/assert';

/**
 * Calculate the measurements a given image should be displayed with, provided some constraints.
 *
 * @param dimensions Known original dimensions of the image.
 * @param constraints Constraints to apply to the image.
 * @returns Proposal for optimal display of the image.
 */
export function constrain({
    dimensions,
    constraints,
}: {
    readonly dimensions: Dimensions;
    readonly constraints: Constraints;
}): ConstrainedDimensions {
    /*
     * First, just scale sequentially (scale down first, then up). Note: The scaled dimensions can
     * still violate the "max" constraints at this point.
     */
    let scaledDimensions = dimensions;

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
            // nonsensical and should therefore never happen.
            return assertUnreachable(
                'Image constraints violated in both dimensions, even after resize',
            );

        default:
            unreachable(constraintViolationDimension);
    }

    return {
        values: constrainedSize,
        isAspectRatioObeyed: getAspectRatio(dimensions) === getAspectRatio(constrainedSize),
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
