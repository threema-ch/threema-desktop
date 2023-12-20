import type {u53} from '~/common/types';

/**
 * Describes a relative or absolute distance from another position.
 */
export interface Offset {
    readonly left: u53;
    readonly top: u53;
}

/**
 * Describes a point on a rectangular shape.
 */
export interface RectPoint {
    readonly horizontal: 'left' | 'center' | 'right';
    readonly vertical: 'top' | 'center' | 'bottom';
}

/**
 * Describes the desired convergence point of the `reference` and popover.
 */
export interface AnchorPoint {
    readonly reference: RectPoint;
    readonly popover: RectPoint;
}

/**
 * Describes a rectangle which is similar to a {@link DOMRect}, but doesn't have to acually exist in
 * the DOM.
 */
export interface VirtualRect extends PartialDOMRect {
    readonly left: u53;
    readonly right: u53;
    readonly top: u53;
    readonly bottom: u53;
    readonly width: u53;
    readonly height: u53;
}

export type PartialDOMRect = Omit<DOMRect, 'x' | 'y' | 'toJSON'>;

/**
 * A function which will close the currently opened popover.
 */
export type PopoverCloseFunction = (event?: MouseEvent) => void;

export type Flip = 'horizontal' | 'vertical' | 'both' | 'none';
