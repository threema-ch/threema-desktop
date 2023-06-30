<!--
  @component
  An element that sticks to another element (the _reference_),
  while ensuring that it doesn't overflow a _container_ (or the window). It handles:

  - Opening and closing.
  - Positioning.
  - Animations.
  - Updating the {@link popoverStore} to ensure that only a single popover is visible.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {fade} from 'svelte/transition';

  import {
    type AnchorPoint,
    getPopoverOffset,
    type Offset,
    popoverStore,
    type VirtualRect,
  } from '~/app/ui/generic/popover';
  import {clickoutside} from '~/app/ui/generic/popover/actions';
  import {unreachable} from '~/common/utils/assert';

  /**
   * The reference element the popover should attach to.
   * If this property is omitted, the `trigger` will be used as the reference.
   */
  export let reference: HTMLElement | VirtualRect | undefined = undefined;

  /**
   * The container which the popover is constrained by.
   */
  let constraintContainer: HTMLElement | undefined = undefined;
  export {constraintContainer as container};

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
  export let anchorPoints: AnchorPoint = {
    reference: {horizontal: 'left', vertical: 'bottom'},
    popover: {horizontal: 'left', vertical: 'top'},
  };

  /**
   * An optional offset to apply to the `popover` position based on the original anchoring.
   * Note: If the `popover` is flipped, the offset will be adjusted automatically.
   */
  export let offset: Offset = {left: 0, top: 0};

  /**
   * Whether to automatically flip the `popover` if it doesn't fit the bounds of the `container`
   * element.
   */
  export let flip = true;

  /**
   * Whether clicking the trigger element should toggle or only open the popover, or if it should be
   * disabled. This will only have an effect if the `trigger` slot is filled.
   */
  export let triggerBehavior: 'toggle' | 'open' | 'none' = 'toggle';

  /**
   * If the `popover` should be closed when a click is detected outside its bounds.
   */
  export let closeOnClickOutside = true;

  // Component event dispatcher
  const dispatch = createEventDispatcher<{
    willopen: undefined;
    willclose: undefined;
    hasopened: undefined;
    hasclosed: undefined;
    clicktrigger: MouseEvent;
    clickoutside: MouseEvent;
  }>();

  // Svelte will set the element explicitly to null, if the element gets deleted.
  // eslint-disable-next-line @typescript-eslint/ban-types
  let positioningContainer: HTMLElement | null = null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  let trigger: HTMLElement | null = null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  let popover: HTMLElement | null = null;

  let position: Offset | undefined = undefined;
  let isVisible = false;

  /**
   * Close the `popover`.
   */
  export function close(): void {
    dispatch('willclose');

    isVisible = false;

    // Remove any existing close function.
    popoverStore.set(undefined);
  }

  /**
   * Open the `popover`.
   */
  export function open(event?: MouseEvent): void {
    dispatch('willopen');

    if ($popoverStore !== undefined) {
      // Call the defined close function.
      $popoverStore(event);
      // Remove the close function.
      popoverStore.set(undefined);
    }
    // Define a new close function.
    popoverStore.set(close);

    isVisible = true;
  }

  /**
   * Open or close the `popover`, depending on its previous state.
   */
  export function toggle(): void {
    if (isVisible) {
      close();
    } else {
      open();
    }
  }

  /**
   * Force recalculation of the popup's positioning, and update.
   */
  export function forceReposition(): void {
    if (isVisible) {
      updatePosition();
    }
  }

  function calculatePosition(): typeof position {
    const currentReference = reference ?? trigger ?? undefined;

    if (!positioningContainer || !currentReference || !popover) {
      return undefined;
    }

    const popoverOffset = getPopoverOffset(
      constraintContainer ?? document.body,
      positioningContainer,
      currentReference,
      popover,
      anchorPoints,
      offset,
      flip,
    );

    return popoverOffset;
  }

  function updatePosition(): void {
    position = calculatePosition();
  }

  function handleTriggerClick(event: MouseEvent): void {
    dispatch('clicktrigger', event);

    switch (triggerBehavior) {
      case 'none':
        break;

      case 'open':
        if (!isVisible) {
          open();
        }
        break;

      case 'toggle':
        toggle();
        break;

      default:
        unreachable(triggerBehavior);
    }
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (popover === null) {
      return;
    }

    if (!isVisible) {
      return;
    }

    // Ignore clicks inside wrapper.
    if (
      event.target === trigger ||
      event.target === popover ||
      trigger?.contains(event.target as Node) === true ||
      popover.contains(event.target as Node)
    ) {
      return;
    }

    dispatch('clickoutside', event);

    if (!closeOnClickOutside) {
      return;
    }

    close();
  }

  $: {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-sequences
    constraintContainer, positioningContainer, reference, trigger, popover;
    updatePosition();
  }
</script>

<template>
  <div class="container" bind:this={positioningContainer}>
    {#if $$slots.trigger}
      <div class="trigger" bind:this={trigger} on:click={handleTriggerClick}>
        <slot name="trigger" />
      </div>
    {/if}

    {#if isVisible}
      <div
        class="popover"
        bind:this={popover}
        transition:fade={{duration: 100}}
        use:clickoutside={{enabled: isVisible}}
        on:clickoutside={({detail: {event}}) => {
          handleOutsideClick(event);
        }}
        on:introend={() => {
          dispatch('hasopened');
        }}
        on:outroend={() => {
          dispatch('hasclosed');
        }}
        style={position !== undefined
          ? `transform: translate(${position.left}px, ${position.top}px);`
          : ''}
      >
        <slot name="popover" />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;

    .popover {
      position: absolute;
      z-index: 1000;
      left: 0;
      top: 0;
    }
  }
</style>
