import type {AnchorPoint, Offset, VirtualRect} from '~/app/ui/generic/popover/types';

/**
 * Props accepted by the `Popover` component.
 */
export interface PopoverProps {
    /**
     * The reference element the popover should attach to.
     * If this property is omitted, the `trigger` will be used as the reference.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    reference?: HTMLElement | VirtualRect | null | undefined;
    /**
     * The HTML element representing this popover (i.e. its outermost container). Note: don't set this
     * value from outside, only bind to it.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    element?: HTMLElement | null | undefined;
    /**
     * The container which the popover is constrained by. The popover will try to always appear inside
     * the bounds of its `container`.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    container?: HTMLElement | null | undefined;
    /**
     * The point on the `reference` and `popover` where the two elements should attach to each other.
     *
     * @example
     * The following config will attach the top left corner of the `popover` to
     * the bottom left corner of the `reference` element:
     * ```ts
     * const exampleAnchorPointConfig = {
     *    reference: {
     *        horizontal: "left",
     *        vertical: "bottom",
     *    },
     *    popover: {
     *        horizontal: "left",
     *        vertical: "top",
     *    }
     * }
     * ```
     */
    anchorPoints?: AnchorPoint;
    /**
     * An optional offset to apply to the `popover` position based on the original anchoring.
     * Note: If the `popover` is flipped, the offset will be adjusted automatically.
     */
    offset?: Offset;
    /**
     * Whether to automatically flip the `popover` if it doesn't fit the bounds of its
     * `container` element. Defaults to `true`.
     */
    flip?: boolean;
    /**
     * Whether clicking the trigger element should toggle or only open the popover, or if it should be
     * disabled. This will only have an effect if the `trigger` slot is filled.
     */
    triggerBehavior?: 'toggle' | 'open' | 'none';
    /**
     * If the `popover` should be closed when a click is detected outside its bounds. Defaults to
     * `true`.
     */
    closeOnClickOutside?: boolean;
    /**
     * Callback that is guaranteed to run before the `popover` opens.
     */
    beforeOpen?: (event?: MouseEvent) => void;
    /**
     * Callback that is guaranteed to run after the `popover` was opened.
     */
    afterOpen?: () => void;
    /**
     * Callback that is guaranteed to run before the `popover` closes.
     */
    beforeClose?: (event?: MouseEvent) => void;
    /**
     * Callback that is guaranteed to run after the `popover` was closed.
     */
    afterClose?: () => void;
}
