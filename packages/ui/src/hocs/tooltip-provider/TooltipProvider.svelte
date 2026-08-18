<!--
  @component Reveals a bubble with text while its trigger is hovered, or focused by keyboard.

  This is the opinionated counterpart to the `PopoverProvider` it is built on: it manages when it is
  shown, it styles the bubble, and its content is plain text. Anything beyond that is composed from
  a `PopoverProvider` directly.

  Note: Unlike most other components in this package, the tooltip owns the state which decides
  whether it is shown, because it's unlikely that it needs to be controlled or observed outside of
  the component itself.

  Note: A tooltip on a disabled `Button` is never shown, because a disabled button receives no
  pointer events. Put the trigger attributes on an element around the button instead.

  @example
  ```svelte
  <TooltipProvider text="Copy conference link">
    {#snippet children(props)}
      <Button {...props} {log} icon={{glyph: 'content_copy'}} onclick={handleClickCopy} shape="circle" />
    {/snippet}
  </TooltipProvider>
  ```
-->

<script lang="ts" module>
  import type {Snippet} from 'svelte';
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import PopoverProvider, {
    type PopoverAnchorProps,
    type PopoverProviderProps,
  } from '../popover-provider/PopoverProvider.svelte';

  /**
   * Attributes to spread onto the trigger element, which wire it up as the tooltip's anchor and
   * report the interactions necessary to reveal it.
   */
  export type TooltipAnchorProps = PopoverAnchorProps & {
    readonly onfocusin: (event: FocusEvent) => void;
    readonly onfocusout: () => void;
  };

  type BaseProps = WithElementRef<
    {
      /**
       * The element the tooltip describes. Receives the attributes to spread onto it. Note: Because
       * it takes those attributes, it has to be written as an explicit
       * `{#snippet children(props)}`.
       */
      readonly children: Snippet<[props: TooltipAnchorProps]>;
      /**
       * Which side of its trigger to place the tooltip on. Defaults to `'block-start'`, i.e. above
       * the trigger.
       */
      readonly placement?: PopoverProviderProps['placement'];
      /**
       * Text to display in the tooltip.
       */
      readonly text: string;
    },
    HTMLDivElement
  >;

  export type TooltipProviderProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>>;
</script>

<script lang="ts">
  let {
    children,
    class: className,
    placement = 'block-start',
    ref = $bindable(null),
    text,
    ...restProps
  }: TooltipProviderProps = $props();

  // The tooltip is shown for as long as at least one of these reasons persists. Note: Tracking them
  // separately matters, because a tooltip revealed by focus must not disappear when the pointer
  // happens to enter the trigger and leave again, and vice versa.
  let isFocused = $state<boolean>(false);
  let isHovered = $state<boolean>(false);

  const isOpen = $derived(isFocused || isHovered);

  // Only a focus the platform itself considers worth showing counts, so that the focus a click
  // leaves behind on its trigger does not keep the tooltip open once the pointer moved away.
  function isFocusVisible(event: FocusEvent): boolean {
    return event.target instanceof Element && event.target.matches(':focus-visible');
  }

  // A click on the trigger acts on whatever the trigger does, so the tooltip which explained it is
  // out of the way.
  function handleClickTrigger(): void {
    isFocused = false;
    isHovered = false;
  }
</script>

<!--
  Note: `@container-[anchored]` allows us to use anchored container queries, see:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Anchored_container_queries.
-->
<PopoverProvider
  class="@container-[anchored] [--popover-gap:--spacing(4)]"
  {isOpen}
  onclicktrigger={handleClickTrigger}
  onhoverend={() => (isHovered = false)}
  onhoverstart={() => (isHovered = true)}
  {placement}
  semantics="description"
>
  {#snippet anchor(anchorProps)}
    {@render children({
      ...anchorProps,
      onfocusin: (event) => (isFocused = isFocusVisible(event)),
      onfocusout: () => (isFocused = false),
    })}
  {/snippet}

  {#snippet popover()}
    <div
      bind:this={ref}
      class={cn(
        'pointer-events-none max-w-70 rounded-lg border border-grey-200 bg-white text-center text-sm text-balance text-grey-900 dark:border-grey-900 dark:bg-grey-900 dark:text-grey-50',
        // A tighter shadow than Tailwind's, which is soft enough to drown the border which outlines
        // the chevron.
        'shadow-[0_2px_6px_-1px_rgb(0_0_0/0.12),0_0_1px_rgb(0_0_0/0.06)]',
        // The padding has to be at least as large as the part of the chevron which reaches into the
        // bubble, so that it never overlaps the text.
        'p-3',
        // Style values used to draw the chevron.
        '[--chevron-border-color:var(--color-grey-200)] [--chevron-overlap:1px] [--chevron-shadow-color:rgb(0_0_0/0.05)] [--chevron-side:--spacing(3)] [--chevron-surface-color:var(--color-white)] dark:[--chevron-border-color:var(--color-grey-900)] dark:[--chevron-shadow-color:transparent] dark:[--chevron-surface-color:var(--color-grey-900)]',
        className,
      )}
      data-placement={placement}
      role="tooltip"
      {...restProps}
    >
      {text}
    </div>
  {/snippet}
</PopoverProvider>

<!--
  The chevron is a pseudo-element of the bubble, so that it can be styled based on the bubble's
  current anchor position. However, it is anchored to the *trigger* individually, so that it keeps
  pointing at the trigger even if the bubble was pushed sideways due to viewport constraints.
-->
<style>
  /* 
    Only render the chevron in browsers which allow us to position it correctly based on the
    bubble's anchor state.
  */
  @supports (container-type: anchored) {
    /*
      Common style of the chevron. The shape is actually a square, rotated by 45 degrees.
    */
    [data-placement]::before {
      --chevron-half: calc(var(--chevron-side) / 2);
      --chevron-gap: var(--popover-gap, var(--popover-gap-default));
      /*
        The offset of the chevron if the bubble (and therefore the chevron) is placed either at
        "block-start" or "inline-start", so it ends up exactly on top of the bubble's border.
      */
      --chevron-inset-at-start: calc(
        anchor(start) - var(--chevron-gap) - var(--chevron-overlap) - var(--chevron-half)
      );
      /*
        The offset of the chevron if the bubble (and therefore the chevron) is placed either at
        "block-end" or "inline-end", so it ends up exactly on top of the bubble's border.
      */
      --chevron-inset-at-end: calc(
        anchor(end) + var(--chevron-gap) + var(--chevron-overlap) - var(--chevron-half)
      );

      content: '';
      /* 
        Not displayed by default, so the chevron is not visible in browsers which do not support
        `@container anchored(fallback: ...)` queries.
      */
      display: none;
      /* Position needs to be `fixed` to allow individual anchoring based on the viewport. */
      position: fixed;
      /* Anchor the chevron to the popover's trigger instead of the bubble. */
      position-anchor: var(--popover-anchor-name);
      width: var(--chevron-side);
      height: var(--chevron-side);
      background-color: var(--chevron-surface-color);
      /*
        Only apply borders to the two sides of the square facing the trigger, and keep the two sides
        that face the inside of the bubble borderless. This makes the element look like a chevron
        instead of a diamond.
      */
      border-block-end: 1px solid var(--chevron-border-color);
      border-inline-end: 1px solid var(--chevron-border-color);
      /* Offset towards the trigger. */
      box-shadow: 3px 3px 3px var(--chevron-shadow-color);
    }

    /* Center the chevron relative to the trigger. */
    [data-placement='block-start']::before,
    [data-placement='block-end']::before {
      inset-inline-start: calc(anchor(center) - var(--chevron-half));
    }
    [data-placement='inline-start']::before,
    [data-placement='inline-end']::before {
      inset-block-start: calc(anchor(center) - var(--chevron-half));
    }

    /*
      The queries below reposition and rotate the chevron based on the desired `data-placement` of
      the bubble, as well as the actual placement of the bubble based on the currently active
      `fallback`. The bubble cannot flip in both directions at the same time (`flip-block
      flip-inline`), because it's always centered on its cross-axis relative to the trigger.

      Note: Each rotation includes `+ 45deg`, so that the square looks like a diamond.
    */

    /*
      The bubble is not flipped, which means it's placed in its original desired location, and so is
      the chevron.
    */
    @container anchored(fallback: none) {
      [data-placement]::before {
        display: block;
      }
      [data-placement='block-start']::before {
        inset-block-start: var(--chevron-inset-at-start);
        rotate: 45deg;
      }
      [data-placement='block-end']::before {
        inset-block-start: var(--chevron-inset-at-end);
        rotate: 225deg;
      }
      [data-placement='inline-start']::before {
        inset-inline-start: var(--chevron-inset-at-start);
        rotate: 315deg;
      }
      [data-placement='inline-end']::before {
        inset-inline-start: var(--chevron-inset-at-end);
        rotate: 135deg;
      }
    }

    /* 
      The bubble is flipped along the block axis, so the block placements of the chevron swap sides.
    */
    @container anchored(fallback: flip-block) {
      [data-placement]::before {
        display: block;
      }
      [data-placement='block-start']::before {
        inset-block-start: var(--chevron-inset-at-end);
        rotate: 225deg;
      }
      [data-placement='block-end']::before {
        inset-block-start: var(--chevron-inset-at-start);
        rotate: 45deg;
      }
      [data-placement='inline-start']::before {
        inset-inline-start: var(--chevron-inset-at-start);
        rotate: 315deg;
      }
      [data-placement='inline-end']::before {
        inset-inline-start: var(--chevron-inset-at-end);
        rotate: 135deg;
      }
    }

    /*
      The bubble is flipped along the inline axis, so the inline placements of the chevron swap
      sides.
    */
    @container anchored(fallback: flip-inline) {
      [data-placement]::before {
        display: block;
      }
      [data-placement='block-start']::before {
        inset-block-start: var(--chevron-inset-at-start);
        rotate: 45deg;
      }
      [data-placement='block-end']::before {
        inset-block-start: var(--chevron-inset-at-end);
        rotate: 225deg;
      }
      [data-placement='inline-start']::before {
        inset-inline-start: var(--chevron-inset-at-end);
        rotate: 135deg;
      }
      [data-placement='inline-end']::before {
        inset-inline-start: var(--chevron-inset-at-start);
        rotate: 315deg;
      }
    }
  }
</style>
