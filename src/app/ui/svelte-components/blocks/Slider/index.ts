import type {u53} from '~/common/types';

/**
 * Display orientation.
 */
export type Orientation = 'vertical' | 'horizontal';

/**
 * Style properties to display correct percentage.
 */
export type StyleAnchor = 'bottom' | 'left';

/**
 * Style properties to display correct percentage.
 */
export type StyleDirection = 'width' | 'height';

/**
 * Calculate the value of given percentage in min and max range.
 */
export function getProgressPercentage(value: u53, min: u53, max: u53): u53 {
    if (value >= min && value <= max) {
        const percent = (value - min) / (max - min);
        return !isNaN(percent) ? percent : 0;
    }

    return 0;
}

/**
 * Calculate the percentage of given value in min and max range.
 */
export function getValueOfPercentage(percentage: u53, min: u53, max: u53): u53 {
    return min + (max - min) * percentage;
}

/**
 * Calculate the step rounded value of percentage.
 */
export function getRoundedValueOfPercentage(percentage: u53, min: u53, max: u53, step: u53): u53 {
    return step * Math.round((percentage * (max - min)) / step) + min;
}

/**
 * Calculate the current value by x / y coords.
 */
export function calculateValueByCoords(
    track: HTMLElement,
    orientation: Orientation,
    direction: StyleDirection,
    min: u53,
    max: u53,
    step: u53,
    x: u53,
    y: u53,
): u53 {
    // Get bounding rectangle
    const rectangle = track.getBoundingClientRect();

    let viewportCoord = 0;
    let rectangleCoord = 0;

    switch (orientation) {
        case 'horizontal':
            viewportCoord = x;
            rectangleCoord = rectangle.x;
            break;

        case 'vertical':
            viewportCoord = rectangle[direction];
            rectangleCoord = y - rectangle.y;
            break;

        default:
            break;
    }

    // Calculate mouse position x in element
    let position = viewportCoord - rectangleCoord;

    // Correct position if mouse is out of div
    if (position > rectangle[direction]) {
        position = rectangle[direction];
    }

    if (position < 0) {
        position = 0;
    }

    // Get calculated value after position changed
    return getRoundedValueOfPercentage(position / rectangle[direction], min, max, step);
}
