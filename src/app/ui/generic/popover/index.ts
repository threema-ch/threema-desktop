import {type ActionReturn} from 'svelte/action';

import {type u32} from '~/common/types';
import {WritableStore} from '~/common/utils/store';

/*
 * `clickoutside` Svelte Action
 */

/**
 * The data that is sent as the `detail` of the `CustomEvent`.
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

export interface Offset {
    readonly left: u32;
    readonly top: u32;
}

export interface RectPoint {
    readonly horizontal: 'left' | 'center' | 'right';
    readonly vertical: 'top' | 'center' | 'bottom';
}

export interface AnchorPoints {
    readonly reference: RectPoint;
    readonly popover: RectPoint;
}

export type PartialDOMRect = Omit<DOMRect, 'x' | 'y' | 'toJSON'>;

export interface VirtualRect extends PartialDOMRect {
    readonly left: u32;
    readonly right: u32;
    readonly top: u32;
    readonly bottom: u32;
    readonly width: u32;
    readonly height: u32;
}

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
type Flip = (typeof flips)[u32];

export function getPopoverTranslation(
    constraintContainer: HTMLElement,
    positioningContainer: HTMLElement,
    reference: HTMLElement | VirtualRect,
    popover: HTMLElement,
    anchorPoints: AnchorPoints,
    offset: Offset = {left: 0, top: 0},
    flip = true,
): Offset {
    const popoverRect = getUntransformedBoundingClientRect(popover);

    const preferredPopoverTranslation = getPopoverTranslationUnchecked(
        positioningContainer,
        reference,
        popover,
        anchorPoints,
        offset,
    );
    const translatedPopoverRect = getRectPlusOffset(popoverRect, preferredPopoverTranslation);

    const suggestedPopoverFlip = flip
        ? getSuggestedPopoverFlip(translatedPopoverRect, constraintContainer)
        : 'none';

    return suggestedPopoverFlip === 'none'
        ? preferredPopoverTranslation
        : getPopoverTranslationUnchecked(
              positioningContainer,
              reference,
              popover,
              getFlippedAnchorPoints(anchorPoints, suggestedPopoverFlip),
              getFlippedOffset(offset, suggestedPopoverFlip),
          );
}

function getPopoverTranslationUnchecked(
    positioningContainer: HTMLElement,
    reference: HTMLElement | VirtualRect,
    popover: HTMLElement,
    anchorPoints: AnchorPoints,
    offset: Offset = {left: 0, top: 0},
): Offset {
    // Rects
    const positioningContainerRect: PartialDOMRect = positioningContainer.getBoundingClientRect();
    const referenceRect: PartialDOMRect =
        reference instanceof HTMLElement ? reference.getBoundingClientRect() : reference;
    const popoverRect: PartialDOMRect = getUntransformedBoundingClientRect(popover);

    // Anchor Point offsets
    const referenceAnchorPointOffset = getRectPointOffset(referenceRect, anchorPoints.reference);
    const popoverAnchorPointOffset = getRectPointOffset(popoverRect, anchorPoints.popover);

    // Deltas
    const popoverToContainerOffset = getRectDelta(popoverRect, positioningContainerRect);
    const referenceToContainerOffset = getRectDelta(referenceRect, positioningContainerRect);

    // Popover translation
    const left =
        popoverToContainerOffset.left +
        referenceToContainerOffset.left +
        (referenceAnchorPointOffset.left - popoverAnchorPointOffset.left) +
        offset.left;
    const top =
        popoverToContainerOffset.top +
        referenceToContainerOffset.top +
        (referenceAnchorPointOffset.top - popoverAnchorPointOffset.top) +
        offset.top;

    return {left, top};
}

function getRectDelta(rect: PartialDOMRect, toRect: PartialDOMRect): Offset {
    return {
        left: rect.left - toRect.left,
        top: rect.top - toRect.top,
    };
}

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

function getFlippedAnchorPoints(anchorPoints: AnchorPoints, flip: Flip): AnchorPoints {
    if (flip === 'none') {
        return anchorPoints;
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
    } = anchorPoints;

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

function getFlippedOffset(offset: Offset, flip: Flip): Offset {
    const isFlipHorizontal = flip === 'horizontal' || flip === 'both';
    const isFlipVertical = flip === 'vertical' || flip === 'both';

    return {
        left: isFlipHorizontal ? -offset.left : offset.left,
        top: isFlipVertical ? -offset.top : offset.top,
    };
}

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

    return {
        horizontal: rect.left >= visibleArea.left && rect.right <= visibleArea.right,
        vertical: rect.top >= visibleArea.top && rect.bottom <= visibleArea.bottom,
    };
}

function getRectPlusOffset(rect: PartialDOMRect, offset: Offset): PartialDOMRect {
    return new DOMRect(rect.left + offset.left, rect.top + offset.top, rect.width, rect.height);
}

function getRectWithOffset(rect: PartialDOMRect, offset: Offset): PartialDOMRect {
    return new DOMRect(offset.left, offset.top, rect.width, rect.height);
}
