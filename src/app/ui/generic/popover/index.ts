import {type ActionReturn} from 'svelte/action';

import {type u53} from '~/common/types';
import {WritableStore} from '~/common/utils/store';

/*
 * `clickoutside` Svelte Action
 */

/**
 * The data that is sent as the `detail` of the {@link CustomEvent}.
 */
interface ClickOutsideEventDetail {
    readonly event: MouseEvent;
}

/**
 * Additional properties that will be accepted on the `use:clickoutside` action.
 */
interface ClickOutsideActionProperties {
    readonly enabled: boolean;
}

/**
 * Additional attributes that Svelte will recognize on elements that use the `use:clickoutside`
 * action.
 */
interface ClickOutsideActionAttributes {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    readonly 'on:clickoutside': (event: CustomEvent<ClickOutsideEventDetail>) => void;
}

export function clickoutside(
    node: HTMLElement,
    {enabled: initialEnabled}: ClickOutsideActionProperties,
): ActionReturn<ClickOutsideActionProperties, ClickOutsideActionAttributes> {
    function handleOutsideClick(event: MouseEvent): void {
        if (!node.contains(event.target as Node)) {
            node.dispatchEvent(
                new CustomEvent<ClickOutsideEventDetail>('clickoutside', {detail: {event}}),
            );
        }
    }

    function update({enabled}: ClickOutsideActionProperties): void {
        if (enabled) {
            window.addEventListener('click', handleOutsideClick);
        } else {
            window.removeEventListener('click', handleOutsideClick);
        }
    }

    update({enabled: initialEnabled});

    return {
        update,
        destroy(): void {
            window.removeEventListener('click', handleOutsideClick);
        },
    };
}

/*
 * Popover
 */

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

type PartialDOMRect = Omit<DOMRect, 'x' | 'y' | 'toJSON'>;

/**
 * A function which will close the currently opened popover.
 */
type PopoverCloseFunction = (event?: MouseEvent) => void;

/**
 * A store that stores a {@link PopoverCloseFunction}.
 *
 * If the store contains `undefined`, then no menu is currently visible.
 */
export const popoverStore = new WritableStore<PopoverCloseFunction | undefined>(undefined);

const flips = ['horizontal', 'vertical', 'both', 'none'] as const;
type Flip = (typeof flips)[u53];

/**
 * Calculates and returns the {@link Offset} that can be used to move/translate the popover to the
 * desired position.
 *
 * @param constraintContainer The container element that constrains the positioning of this popover.
 * @param positioningContainer The container element that is used as the origin to calculate
 * relative positioning.
 * @param reference Element or virtual element that the popover will be anchored to.
 * @param popover The popover element.
 * @param anchorPoints Configuration of where the popover should attach to the anchor.
 * @param offset An optional offset to move the popover relative to the anchor.
 * @param flip Whether the popover should flip so that it doesn't overflow the
 * `constraintContainer`.
 * @returns The {@link Offset} the popover should move to be at the desired position.
 */
export function getPopoverOffset(
    constraintContainer: HTMLElement,
    positioningContainer: HTMLElement,
    reference: HTMLElement | VirtualRect,
    popover: HTMLElement,
    anchorPoints: AnchorPoint,
    offset: Offset = {left: 0, top: 0},
    flip = true,
): Offset {
    // Get the `DOMRect` of the popover, but disregard any previously applied transforms.
    const popoverRect = getUntransformedBoundingClientRect(popover);

    // Calculate the preferred `Offset` of the popover without considering any constraints.
    const preferredPopoverTranslation = getUnconstrainedPopoverOffset(
        positioningContainer,
        reference,
        popover,
        anchorPoints,
        offset,
    );
    const translatedPopoverRect = getRectPlusOffset(popoverRect, preferredPopoverTranslation);

    // Calculate the necessary `Flip` that needs to be applied so that the popover is fully visible.
    const suggestedPopoverFlip = flip
        ? getSuggestedPopoverFlip(translatedPopoverRect, constraintContainer)
        : 'none';

    // Calculate and return the final `Offset` of the popover, and account for a possible `Flip`.
    return suggestedPopoverFlip === 'none'
        ? preferredPopoverTranslation
        : getUnconstrainedPopoverOffset(
              positioningContainer,
              reference,
              popover,
              getFlippedAnchorPoint(anchorPoints, suggestedPopoverFlip),
              getFlippedOffset(offset, suggestedPopoverFlip),
          );
}

/**
 * Calculates and returns the {@link Offset} that can be used to move/translate the popover to the
 * desired position without considering any constraints.
 *
 * @param positioningContainer The container element that is used as the origin to calculate
 * relative positioning.
 * @param reference Element or virtual element that the popover will be anchored to.
 * @param popover The popover element.
 * @param anchorPoints Configuration of where the popover should attach to the anchor.
 * @param offset An optional offset to move the popover relative to the anchor.
 * @returns The {@link Offset} the popover should move to be at the desired position.
 */
function getUnconstrainedPopoverOffset(
    positioningContainer: HTMLElement,
    reference: HTMLElement | VirtualRect,
    popover: HTMLElement,
    anchorPoints: AnchorPoint,
    offset: Offset = {left: 0, top: 0},
): Offset {
    // Get `DOMRect`s.
    const positioningContainerRect: PartialDOMRect = positioningContainer.getBoundingClientRect();
    const referenceRect: PartialDOMRect =
        reference instanceof HTMLElement ? reference.getBoundingClientRect() : reference;
    const popoverRect: PartialDOMRect = getUntransformedBoundingClientRect(popover);

    // Calculate `AnchorPoint` offsets.
    const referenceAnchorPointOffset = getRectPointOffset(referenceRect, anchorPoints.reference);
    const popoverAnchorPointOffset = getRectPointOffset(popoverRect, anchorPoints.popover);

    // Calculate Deltas.
    const popoverToContainerOffset = getRelativeRectOffset(popoverRect, positioningContainerRect);
    const referenceToContainerOffset = getRelativeRectOffset(
        referenceRect,
        positioningContainerRect,
    );

    // Calculate and return translation.
    return {
        left:
            popoverToContainerOffset.left +
            referenceToContainerOffset.left +
            (referenceAnchorPointOffset.left - popoverAnchorPointOffset.left) +
            offset.left,
        top:
            popoverToContainerOffset.top +
            referenceToContainerOffset.top +
            (referenceAnchorPointOffset.top - popoverAnchorPointOffset.top) +
            offset.top,
    };
}

/**
 * Calculates and returns the relative distance between two {@link PartialDOMRect}s.
 *
 * @param rect The {@link PartialDOMRect} to calculate the distance from.
 * @param toRect The {@link PartialDOMRect} to calculate the distance to.
 * @returns The relative distance between the two {@link PartialDOMRect}s as an {@link Offset}.
 */
function getRelativeRectOffset(rect: PartialDOMRect, toRect: PartialDOMRect): Offset {
    return {
        left: rect.left - toRect.left,
        top: rect.top - toRect.top,
    };
}

/**
 * Calculates and returns the {@link PartialDOMRect} that describes the spatial properties of an
 * {@link HTMLElement} without considering any transforms that have been applied to it.
 *
 * @param element The {@link HTMLElement} to get the {@link PartialDOMRect} from.
 * @returns The calculated {@link PartialDOMRect}.
 */
function getUntransformedBoundingClientRect(element: HTMLElement): PartialDOMRect {
    const rect = element.getBoundingClientRect();
    const computedStyle = getComputedStyle(element);
    const transform = computedStyle.transform;

    if (transform === 'none') {
        return rect;
    }

    const transformMatrix = new DOMMatrix(transform);
    const inverseTransformMatrix = transformMatrix.invertSelf();
    const offsetWithTransform = new DOMPoint(rect.left, rect.top);
    const offsetWithoutTransform = offsetWithTransform.matrixTransform(inverseTransformMatrix);

    return getRectWithOffset(rect, {left: offsetWithoutTransform.x, top: offsetWithoutTransform.y});
}

/**
 * Calculates and returns the distance of a {@link RectPoint} from a {@link PartialDOMRect} as an
 * {@link Offset}.
 *
 * @param rect The {@link PartialDOMRect} that the `rectPoint` belongs to.
 * @param rectPoint The {@link RectPoint} to calculate its {@link Offset} from (relative to the
 * `rect`).
 * @returns The distance of the `rectPoint` relative to the `rect`.
 */
function getRectPointOffset(rect: PartialDOMRect, rectPoint: RectPoint): Offset {
    const horizontalOffsetMap = {
        left: 0,
        center: rect.width / 2,
        right: rect.width,
    };

    const verticalOffsetMap = {
        top: 0,
        center: rect.height / 2,
        bottom: rect.height,
    };

    return {
        left: horizontalOffsetMap[rectPoint.horizontal],
        top: verticalOffsetMap[rectPoint.vertical],
    };
}

/**
 * Calculates and returns the required {@link Flip} so that the popover doesn't overflow the
 * `constraintContainer`.
 *
 * @param popoverRect The {@link PartialDOMRect} of the popover.
 * @param constraintContainer The container that constrains the positioning of the popover.
 * @returns A proposed {@link Flip} to apply to the popover.
 */
function getSuggestedPopoverFlip(
    popoverRect: PartialDOMRect,
    constraintContainer: HTMLElement,
): Flip {
    const {horizontal, vertical} = getIsRectInVisibleAreaOfContainer(
        popoverRect,
        constraintContainer,
    );

    if (horizontal && vertical) {
        return 'none';
    }

    if (!horizontal && !vertical) {
        return 'both';
    }

    if (horizontal) {
        return 'vertical';
    }

    if (vertical) {
        return 'horizontal';
    }

    // Should be unreachable, but just in case, don't transform at all.
    return 'none';
}

/**
 * Calculates and returns the inverse {@link AnchorPoint} definition based on an existing
 * {@link AnchorPoint} and a {@link Flip}.
 *
 * @param anchorPoint The {@link AnchorPoint} to flip.
 * @param flip The {@link Flip} to use to invert the `anchorPoint` by.
 * @returns A new {@link AnchorPoint} inverted by the supplied {@link Flip}.
 */
function getFlippedAnchorPoint(anchorPoint: AnchorPoint, flip: Flip): AnchorPoint {
    if (flip === 'none') {
        return anchorPoint;
    }

    const horizontalInverseMap: Record<RectPoint['horizontal'], RectPoint['horizontal']> = {
        left: 'right',
        center: 'center',
        right: 'left',
    };

    const verticalInverseMap: Record<RectPoint['vertical'], RectPoint['vertical']> = {
        top: 'bottom',
        center: 'center',
        bottom: 'top',
    };

    const isFlipHorizontal = flip === 'horizontal' || flip === 'both';
    const isFlipVertical = flip === 'vertical' || flip === 'both';

    const {
        reference: {horizontal: rh, vertical: rv},
        popover: {horizontal: ph, vertical: pv},
    } = anchorPoint;

    return {
        reference: {
            horizontal: isFlipHorizontal ? horizontalInverseMap[rh] : rh,
            vertical: isFlipVertical ? verticalInverseMap[rv] : rv,
        },
        popover: {
            horizontal: isFlipHorizontal ? horizontalInverseMap[ph] : ph,
            vertical: isFlipVertical ? verticalInverseMap[pv] : pv,
        },
    };
}

/**
 * Calculates and returns an inverse {@link Offset} based on an existing {@link Offset} and a
 * {@link Flip}.
 *
 * @param offset The {@link Offset} to flip.
 * @param flip The {@link Flip} to apply to the `offset`.
 * @returns A new {@link Offset} inverted by the supplied {@link Flip}.
 */
function getFlippedOffset(offset: Offset, flip: Flip): Offset {
    const isFlipHorizontal = flip === 'horizontal' || flip === 'both';
    const isFlipVertical = flip === 'vertical' || flip === 'both';

    return {
        left: isFlipHorizontal ? -offset.left : offset.left,
        top: isFlipVertical ? -offset.top : offset.top,
    };
}

/**
 * Calculates and returns if a {@link PartialDOMRect} is (spatially) enclosed by a container.
 *
 * @param rect The {@link PartialDOMRect} to check if its area is enclosed by the `container`.
 * @param container The {@link HTMLElement} to check if it encloses the area of the `rect`.
 * @returns Whether the `rect` is enclosed by the area of the `container`, by direction.
 */
function getIsRectInVisibleAreaOfContainer(
    rect: PartialDOMRect,
    container: HTMLElement,
): {horizontal: boolean; vertical: boolean} {
    const containerRect = container.getBoundingClientRect();

    const visibleArea = {
        top: containerRect.top,
        left: containerRect.left,
        bottom: Math.min(containerRect.bottom, window.innerHeight),
        right: Math.min(containerRect.right, window.innerWidth),
    };

    // Ceil and floor rounding are necessary in case the app on electron is not being displayed at
    // 100% zoom.
    // REF: https://bugs.chromium.org/p/chromium/issues/detail?id=359691
    return {
        horizontal:
            Math.ceil(rect.left) >= Math.floor(visibleArea.left) &&
            Math.floor(rect.right) <= Math.ceil(visibleArea.right),
        vertical:
            Math.ceil(rect.top) >= Math.floor(visibleArea.top) &&
            Math.floor(rect.bottom) <= Math.ceil(visibleArea.bottom),
    };
}

/**
 * Returns a new {@link PartialDOMRect} based on the supplied `rect` and the `offset` added.
 *
 * @param rect The {@link PartialDOMRect} to add the `offset` to.
 * @param offset The {@link Offset} to add to the `rect`.
 * @returns A new {@link PartialDOMRect} with the `offset` added.
 */
function getRectPlusOffset(rect: PartialDOMRect, offset: Offset): PartialDOMRect {
    return new DOMRect(rect.left + offset.left, rect.top + offset.top, rect.width, rect.height);
}

/**
 * Returns a new {@link PartialDOMRect} based on the supplied `rect`, with its positional properties
 * replaced by the supplied `offset`.
 *
 * @param rect The {@link PartialDOMRect} to replace the position of.
 * @param offset The {@link Offset} to replace the position of the `rect` with.
 * @returns A new {@link PartialDOMRect} with the position replaced.
 */
function getRectWithOffset(rect: PartialDOMRect, offset: Offset): PartialDOMRect {
    return new DOMRect(offset.left, offset.top, rect.width, rect.height);
}
