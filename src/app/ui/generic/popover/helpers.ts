import type {
    AnchorPoint,
    Flip,
    Offset,
    Padding,
    PartialDOMRect,
    PopoverCloseFunction,
    RectPoint,
    VirtualRect,
} from '~/app/ui/generic/popover/types';
import type {i53} from '~/common/types';
import {clamp} from '~/common/utils/number';
import {WritableStore} from '~/common/utils/store';

/**
 * A store that stores a {@link PopoverCloseFunction}.
 *
 * If the store contains `undefined`, then no menu is currently visible.
 */
export const popoverStore = new WritableStore<PopoverCloseFunction | undefined>(undefined);

/**
 * Calculates and returns the {@link Offset} that can be used to move/translate the popover to the
 * desired position.
 *
 * @param constraintContainer The container element that constrains the positioning of this popover.
 * @param positioningContainer The container element that is used as the origin to calculate
 *   relative positioning.
 * @param reference Element or virtual element that the popover will be anchored to.
 * @param popover The popover element.
 * @param anchorPoints Configuration of where the popover should attach to the anchor.
 * @param offset An optional offset to move the popover relative to the anchor.
 * @param flip Whether the popover should flip so that it doesn't overflow the
 *   `constraintContainer`.
 * @param safetyGap An additional gap relative to the `constraintContainer`.
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
    safetyGap: Padding = {left: 0, right: 0, top: 0, bottom: 0},
): Offset {
    // 1. Get the `DOMRect` of the popover, but disregard any previously applied transforms (e.g.,
    //    if the popover has already been positioned previously).
    const popoverRect = getBoundingClientRectWithoutTransforms(popover);

    // 2. Calculate the preferred offset of the popover without considering any constraints.
    const preferredPopoverOffset = getUnconstrainedPopoverOffset(
        positioningContainer,
        reference,
        popover,
        anchorPoints,
        offset,
    );
    const popoverRectWithOffset = getRectPlusOffset(popoverRect, preferredPopoverOffset);

    // 3. Calculate whether (and in which direction) the popover needs to be flipped to be fully
    //    visible.
    const suggestedPopoverFlip = flip
        ? getSuggestedPopoverFlip(popoverRectWithOffset, constraintContainer, safetyGap)
        : 'none';

    // 4. Calculate and return the final offset of the popover, and account for a possible flip.
    const popoverOffsetAfterFlip =
        suggestedPopoverFlip === 'none'
            ? preferredPopoverOffset
            : getUnconstrainedPopoverOffset(
                  positioningContainer,
                  reference,
                  popover,
                  getFlippedAnchorPoint(anchorPoints, suggestedPopoverFlip),
                  getFlippedOffset(offset, suggestedPopoverFlip),
              );
    const popoverRectAfterFlip = getRectPlusOffset(popoverRect, popoverOffsetAfterFlip);

    // 5. If the popover is still not fully visible, even after flipping it, just move it until it
    //    is (best-effort).
    const popoverOffsetCorrection = getSuggestedOffsetCorrection(
        popoverRectAfterFlip,
        constraintContainer,
        safetyGap,
    );

    // Return the suggested offset the popover should be translated by, relative to its original
    // position.
    return {
        left: popoverOffsetAfterFlip.left + popoverOffsetCorrection.left,
        top: popoverOffsetAfterFlip.top + popoverOffsetCorrection.top,
    };
}

/**
 * Calculates and returns the {@link Offset} that can be used to move/translate the popover to the
 * desired position without considering any constraints.
 *
 * @param positioningContainer The container element that is used as the origin to calculate
 *   relative positioning.
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
    const popoverRect: PartialDOMRect = getBoundingClientRectWithoutTransforms(popover);

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
function getBoundingClientRectWithoutTransforms(element: HTMLElement): PartialDOMRect {
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
 *   `rect`).
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
 * @param safetyGap Minimum distance from the `constraintContainer`'s bounds which is considered
 *   safe for positioning without needing a flip.
 * @returns A proposed {@link Flip} to apply to the popover.
 */
function getSuggestedPopoverFlip(
    popoverRect: PartialDOMRect,
    constraintContainer: HTMLElement,
    safetyGap: Padding = {left: 0, right: 0, top: 0, bottom: 0},
): Flip {
    const {horizontal, vertical} = getIsRectInVisibleAreaOfContainer(
        popoverRect,
        constraintContainer,
        safetyGap,
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
 * Calculates the suggested {@link Offset} by which the `popoverRect` should be moved to be fully
 * (or optimally) visible inside the container.
 *
 * @param popoverRect The {@link PartialDOMRect} of the popover.
 * @param constraintContainer The container that should constrain the popover.
 * @param safetyGap Minimum distance to try to ensure between `popoverRect` and `constraintContainer`.
 * @returns The suggested offset to move the popover by.
 */
function getSuggestedOffsetCorrection(
    popoverRect: PartialDOMRect,
    constraintContainer: HTMLElement,
    safetyGap: Padding = {left: 0, right: 0, top: 0, bottom: 0},
): Offset {
    const containerRect = constraintContainer.getBoundingClientRect();
    const visibleArea = {
        ...containerRect,
        top: Math.max(containerRect.top, 0) + safetyGap.top,
        left: Math.max(containerRect.left, 0) + safetyGap.left,
        bottom: Math.min(containerRect.bottom, window.innerHeight) - safetyGap.bottom,
        right: Math.min(containerRect.right, window.innerWidth) - safetyGap.right,
    };
    const relativeOffset = getBoundingRectRelativeToContainer(popoverRect, visibleArea);

    // Return early if there is no overflow.
    if (
        relativeOffset.top >= 0 &&
        relativeOffset.left >= 0 &&
        relativeOffset.bottom >= 0 &&
        relativeOffset.right >= 0
    ) {
        return {
            left: 0,
            top: 0,
        };
    }

    // If we're in a horizontal scroll container, this indicates whether we are in the first half
    // (left half) of the scroll container or the second (right half). This provides an
    // understanding of whether we're likely able to scroll further to reveal more of the
    // overflowing popover (i.e., if we're in the first half) or if it would be better to position
    // it so that it can be revealed by scrolling back (if we're in the second half). Note: This
    // doesn't guarantee that the positioning will allways be perfect such that the user is able to
    // reveal it fully, but it increases the likelihood.
    const horizontalScrollPosition =
        constraintContainer.scrollLeft <
        constraintContainer.scrollWidth - constraintContainer.scrollLeft
            ? 'left-half'
            : 'right-half';
    // See comment above.
    const verticalScrollPosition =
        constraintContainer.scrollTop <
        constraintContainer.scrollHeight - constraintContainer.scrollTop
            ? 'top-half'
            : 'bottom-half';

    // The amount by which the popover overflows its container.
    const overflow = {
        top: Math.abs(Math.min(relativeOffset.top, 0)),
        left: Math.abs(Math.min(relativeOffset.left, 0)),
        bottom: Math.abs(Math.min(relativeOffset.bottom, 0)),
        right: Math.abs(Math.min(relativeOffset.right, 0)),
    };

    let offsetCorrectionLeft = 0;
    if (horizontalScrollPosition === 'left-half') {
        // Because we're in the left half, moving the popover more to the right is likely safer.
        offsetCorrectionLeft =
            overflow.left > overflow.right
                ? // Popover overflow is larger on the left side: Move it to the right (add more
                  // offset on the left) as much as needed to clear the entire left overflow.
                  clamp(overflow.left, {min: 0})
                : // Popover overflow is larger on the right side: Move it to the left (reduce offset
                  // on the left), but only as far as not to add additional overflow on the left.
                  -clamp(overflow.right, {
                      min: 0,
                      max: relativeOffset.left,
                  });
    } else {
        // Because we're in the right half, moving the popover more to the left is likely safer.
        offsetCorrectionLeft =
            overflow.left > overflow.right
                ? // Popover overflow is larger on the left side: Move it to the right (add offset on
                  // the left), but only as far as not to add additional overflow on the right.
                  clamp(overflow.left, {
                      min: 0,
                      max: relativeOffset.right,
                  })
                : // Popover overflow is larger on the right side: Move it to the left (reduce offset
                  // on the left) as much as needed to clear the entire right overflow.
                  -clamp(overflow.right, {min: 0});
    }

    let offsetCorrectionTop = 0;
    if (verticalScrollPosition === 'top-half') {
        offsetCorrectionTop =
            overflow.top > overflow.bottom
                ? clamp(overflow.top, {min: 0})
                : -clamp(overflow.bottom, {
                      min: 0,
                      max: relativeOffset.top,
                  });
    } else {
        offsetCorrectionTop =
            overflow.top > overflow.bottom
                ? clamp(overflow.top, {
                      min: 0,
                      max: relativeOffset.bottom,
                  })
                : -clamp(overflow.bottom, {min: 0});
    }

    return {
        left: offsetCorrectionLeft,
        top: offsetCorrectionTop,
    };
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
 * @param safetyGap Minimum distance needed between `rect` and `container` before considering it to
 *   be in the visible area.
 * @returns Whether the `rect` is enclosed by the area of the `container`, by direction.
 */
function getIsRectInVisibleAreaOfContainer(
    rect: PartialDOMRect,
    container: HTMLElement,
    safetyGap: Padding = {left: 0, right: 0, top: 0, bottom: 0},
): {horizontal: boolean; vertical: boolean} {
    const containerRect = container.getBoundingClientRect();

    const visibleArea = {
        top: Math.max(containerRect.top, 0) + safetyGap.top,
        left: Math.max(containerRect.left, 0) + safetyGap.left,
        bottom: Math.min(containerRect.bottom, window.innerHeight) - safetyGap.bottom,
        right: Math.min(containerRect.right, window.innerWidth) - safetyGap.right,
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

/**
 * Returns the position of a `rect` relative to the supplied `containerRect`.
 *
 * @param rect The rect to get the position of.
 * @param containerRect The container to calculate the relative position from.
 * @returns The position of `rect` relative to `containerRect` on all its sides.
 */
function getBoundingRectRelativeToContainer(
    rect: PartialDOMRect,
    containerRect: PartialDOMRect,
): {left: i53; right: i53; top: i53; bottom: i53} {
    return {
        left: Math.floor(rect.left) - Math.ceil(containerRect.left),
        right: Math.floor(containerRect.right) - Math.ceil(rect.right),
        top: Math.floor(rect.top) - Math.ceil(containerRect.top),
        bottom: Math.floor(containerRect.bottom) - Math.ceil(rect.bottom),
    };
}
