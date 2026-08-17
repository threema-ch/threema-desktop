<!--
  @component Attaches a popover to a trigger element.

  The popover is rendered in the top layer and positioned relative to its trigger, which means it is
  never clipped by an ancestor with `overflow: hidden`, and it does not need a stacking context.

  This component is stateless: whether the popover is open is determined by the `isOpen` prop, and
  user interactions are only reported through callbacks. It is therefore up to the consumer to
  decide whether the popover opens on click, on hover, or both, and wire up the respective behavior.

  The gap between the popover and its trigger is 10px by default, and can be adjusted by overriding
  the `--popover-gap` CSS variable.

  @example
  ```svelte
  <script lang="ts">
    let isOpen = $state<boolean>(false);
  </script>

  <PopoverProvider
    {isOpen}
    onclickoutside={() => (isOpen = false)}
    onclicktrigger={() => (isOpen = !isOpen)}
    placement="block-start"
  >
    {#snippet anchor(props)}
      <button {...props} type="button">Toggle</button>
    {/snippet}

    {#snippet popover()}
      <p>Popover content</p>
    {/snippet}
  </PopoverProvider>
  ```
-->

<script lang="ts" module>
  import {nodeIsOrContainsTarget} from '@threema/dom';
  import {type Snippet, onDestroy} from 'svelte';
  import {createAttachmentKey} from 'svelte/attachments';
  import type {HTMLAttributes} from 'svelte/elements';
  import {type VariantProps, cn, tv} from 'tailwind-variants';

  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';

  export const popoverProviderVariants = tv({
    base: [
      // Note: A popover is styled and centered in the viewport by the user agent stylesheet, which
      // has to be undone before it can be positioned relative to its anchor. In particular `inset`
      // and `place-self` interfere with `position-area`, see:
      // https://github.com/w3c/csswg-drafts/issues/10258.
      'inset-auto m-0 [place-self:normal] overflow-visible border-none bg-transparent text-inherit',
      // Note: The `anchor-name` is passed to the trigger as part of the `anchorProps`, and is also
      // passed to the popover container dynamically as `--popover-anchor-name` in the script below,
      // so that we can use it here to attach the popover to its trigger using `position-anchor`.
      '[position-anchor:var(--popover-anchor-name)]',
      // Fallback and visibility behavior of the anchor.
      '[position-try-fallbacks:flip-block,flip-inline,flip-block_flip-inline] [position-visibility:anchors-visible]',
      // Default value for the gap between anchor and popover. Note: A consumer can set
      // `--popover-gap` to provide a different value, if desired.
      '[--popover-gap-default:--spacing(2.5)]',
    ],
    variants: {
      align: {
        center: '',
        end: '',
        start: '',
      },
      // The padding is applied to both sides of the axis the popover is placed on, so that it
      // always covers the side which faces the trigger, no matter which side that ends up being.
      placement: {
        'block-end': 'px-0 py-[var(--popover-gap,var(--popover-gap-default))]',
        'block-start': 'px-0 py-[var(--popover-gap,var(--popover-gap-default))]',
        'inline-end': 'px-[var(--popover-gap,var(--popover-gap-default))] py-0',
        'inline-start': 'px-[var(--popover-gap,var(--popover-gap-default))] py-0',
      },
    },
    // A placement along the block axis is aligned along the inline axis, and vice versa.
    //
    // Note: The area spans towards the *opposite* end of the alignment, so that popovers which are
    // larger than their trigger stay aligned at the edge set to `align`.
    compoundVariants: [
      {
        align: 'start',
        placement: 'block-start',
        class: '[position-area:block-start_span-inline-end]',
      },
      {align: 'center', placement: 'block-start', class: '[position-area:block-start_span-all]'},
      {
        align: 'end',
        placement: 'block-start',
        class: '[position-area:block-start_span-inline-start]',
      },
      {align: 'start', placement: 'block-end', class: '[position-area:block-end_span-inline-end]'},
      {align: 'center', placement: 'block-end', class: '[position-area:block-end_span-all]'},
      {align: 'end', placement: 'block-end', class: '[position-area:block-end_span-inline-start]'},
      {
        align: 'start',
        placement: 'inline-start',
        class: '[position-area:inline-start_span-block-end]',
      },
      {align: 'center', placement: 'inline-start', class: '[position-area:inline-start_span-all]'},
      {
        align: 'end',
        placement: 'inline-start',
        class: '[position-area:inline-start_span-block-start]',
      },
      {align: 'start', placement: 'inline-end', class: '[position-area:inline-end_span-block-end]'},
      {align: 'center', placement: 'inline-end', class: '[position-area:inline-end_span-all]'},
      {align: 'end', placement: 'inline-end', class: '[position-area:inline-end_span-block-start]'},
    ],
    defaultVariants: {
      align: 'center',
      placement: 'block-end',
    },
  });

  type PopoverProviderVariants = VariantProps<typeof popoverProviderVariants>;

  /**
   * Attributes to spread onto the trigger element, which wire it up as the popover's anchor and
   * report interactions with it.
   */
  export interface PopoverAnchorProps {
    /** Attachment which keeps track of the trigger element. */
    readonly [key: symbol]: (element: HTMLElement) => void;
    /* eslint-disable @typescript-eslint/naming-convention */
    readonly 'aria-controls'?: string;
    readonly 'aria-describedby'?: string;
    readonly 'aria-expanded'?: boolean;
    /* eslint-enable @typescript-eslint/naming-convention */
    readonly 'onclick': (event: MouseEvent) => void;
    readonly 'onmouseenter': () => void;
    readonly 'onmouseleave': () => void;
    readonly 'style': string;
  }

  type BaseProps = WithElementRef<
    {
      /**
       * How to align the popover with its trigger, along the cross axis. For a popover placed at
       * the `'block-start'`, `'end'` means that its inline-end edge is aligned with the trigger's
       * inline-end edge. Defaults to `'center'`.
       */
      readonly align?: PopoverProviderVariants['align'];
      /**
       * The element the popover is attached to. Receives the attributes to spread onto it to wire
       * up the trigger events, etc.
       */
      readonly anchor: Snippet<[props: PopoverAnchorProps]>;
      /**
       * Whether the popover is currently open. Note: This state must be controlled by the consumer,
       * and the popover does not open by itself.
       */
      readonly isOpen: boolean;
      /**
       * Called when a click landed outside of both the trigger and the popover, while the popover
       * is open.
       */
      readonly onclickoutside?: (event: MouseEvent) => void;
      /**
       * Called when the trigger was clicked.
       */
      readonly onclicktrigger?: (event: MouseEvent) => void;
      /**
       * Called when the pointer left both the trigger and the popover. Moving the pointer from the
       * trigger into the popover does not end the hover.
       */
      readonly onhoverend?: () => void;
      /**
       * Called when the pointer entered the trigger or the popover. Moving the pointer from one
       * into the other does not start a second hover.
       */
      readonly onhoverstart?: () => void;
      /**
       * Which side of its trigger to place the popover on. Defaults to `'block-end'`.
       *
       * Note: If the popover does not fit there, the user agent flips it to the opposite side, to
       * the opposite alignment, or both, in that order.
       */
      readonly placement?: PopoverProviderVariants['placement'];
      /**
       * Content of the popover.
       */
      readonly popover: Snippet;
      /**
       * How the trigger is related to the popover for assistive technology. A `'disclosure'`
       * trigger controls the popover and reports whether it is currently expanded, while a
       * `'description'` trigger is described by it, which is what e.g. a tooltip needs. Defaults to
       * `'disclosure'`.
       */
      readonly semantics?: 'description' | 'disclosure';
    },
    HTMLDivElement
  >;

  export type PopoverProviderProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>>;
</script>

<script lang="ts">
  let {
    align,
    anchor,
    class: className,
    isOpen,
    onclickoutside,
    onclicktrigger,
    onhoverend,
    onhoverstart,
    placement = 'block-end',
    popover,
    ref = $bindable(null),
    semantics = 'disclosure',
    ...restProps
  }: PopoverProviderProps = $props();

  const id = $props.id();
  const anchorName = `--popover-${id}`;

  let triggerElement: HTMLElement | undefined = undefined;

  /**
   * Whether the pointer is currently over the trigger or over the popover. Because the popover is
   * rendered in the top layer, it is not a descendant of the trigger, so the two are tracked
   * separately and combined into a single hover state.
   */
  let hovered = {popover: false, trigger: false};
  let pendingHoverEnd: number | undefined = undefined;

  // Note: The key and the attachment itself are created once, so that recreating the props below
  // does not detach and reattach it.
  const triggerAttachmentKey = createAttachmentKey();

  function attachTrigger(element: HTMLElement): void {
    triggerElement = element;
  }

  function handleClickTrigger(event: MouseEvent): void {
    onclicktrigger?.(event);
  }

  function handleHoverStart(source: 'popover' | 'trigger'): void {
    // A pending hover end means the pointer is on its way from one of the two elements to the
    // other, i.e. the hover is still ongoing. Note: This must be read before the pending end is
    // cancelled.
    const wasHovered = hovered.popover || hovered.trigger || pendingHoverEnd !== undefined;
    cancelPendingHoverEnd();

    hovered = {...hovered, [source]: true};
    if (!wasHovered) {
      onhoverstart?.();
    }
  }

  function handleHoverEnd(source: 'popover' | 'trigger'): void {
    hovered = {...hovered, [source]: false};
    cancelPendingHoverEnd();

    // Defer, because moving the pointer from the trigger into the popover (or the other way around)
    // ends the hover on one of them before it begins on the other.
    pendingHoverEnd = requestAnimationFrame(() => {
      pendingHoverEnd = undefined;
      if (!hovered.popover && !hovered.trigger) {
        onhoverend?.();
      }
    });
  }

  function cancelPendingHoverEnd(): void {
    if (pendingHoverEnd !== undefined) {
      cancelAnimationFrame(pendingHoverEnd);
      pendingHoverEnd = undefined;
    }
  }

  // Note: The attributes which do not apply to the requested `semantics` are `undefined`, which
  // means they are left off the trigger element entirely.
  const anchorProps = $derived<PopoverAnchorProps>({
    [triggerAttachmentKey]: attachTrigger,
    'aria-controls': semantics === 'disclosure' ? id : undefined,
    'aria-describedby': semantics === 'description' ? id : undefined,
    'aria-expanded': semantics === 'disclosure' ? isOpen : undefined,
    'onclick': handleClickTrigger,
    'onmouseenter': () => handleHoverStart('trigger'),
    'onmouseleave': () => handleHoverEnd('trigger'),
    'style': `anchor-name: ${anchorName}`,
  });

  // Reconcile the requested state with the popover's actual state.
  //
  // Note: The popover API is imperative, i.e. it cannot be bound to a value, and both of its
  // functions throw if the popover is already in the requested state.
  $effect(() => {
    if (ref === null) {
      return;
    }

    if (isOpen && !ref.matches(':popover-open')) {
      ref.showPopover();
    } else if (!isOpen && ref.matches(':popover-open')) {
      ref.hidePopover();
    }
  });

  // Report clicks which landed outside of the trigger and the popover, while the popover is open.
  //
  // Note: The listener is attached after the click which opened the popover has already been
  // dispatched, so it doesn't immediately close again.
  $effect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleClickDocument(event: MouseEvent): void {
      if (
        nodeIsOrContainsTarget(triggerElement, event.target) ||
        nodeIsOrContainsTarget(ref, event.target)
      ) {
        return;
      }

      onclickoutside?.(event);
    }

    document.addEventListener('click', handleClickDocument);

    return () => {
      document.removeEventListener('click', handleClickDocument);
    };
  });

  onDestroy(cancelPendingHoverEnd);
</script>

{@render anchor(anchorProps)}

<!-- Popover is "manual" so that it cannot close by itself. -->
<div
  bind:this={ref}
  {id}
  class={cn(popoverProviderVariants({align, placement}), className)}
  onmouseenter={() => handleHoverStart('popover')}
  onmouseleave={() => handleHoverEnd('popover')}
  popover="manual"
  style:--popover-anchor-name={anchorName}
  {...restProps}
>
  {@render popover()}
</div>
