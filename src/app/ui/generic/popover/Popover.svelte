<!--
  @component
  An element that sticks to another element (the _anchor_), 
  while ensuring that it doesn't overflow a _container_ (or the window). It handles:

  - Opening and closing
  - Positioning
-->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import {type Offset, type RectPoint, rectPointOffset} from '.';

  /**
   * The anchor the popover should stick to
   */
  export let anchor: HTMLElement | undefined = undefined;

  /**
   * The point on the `anchor` where the `popover` should "attach" to
   */
  export let attachAt: RectPoint = {
    x: 'left',
    y: 'bottom',
  };

  /**
   * The point on the `popover` where it attaches to the `anchorAt` point
   */
  export let popoverOrigin: RectPoint = {
    x: 'left',
    y: 'top',
  };

  /**
   * An optional offset to apply to the `popover` position
   */
  export let offset: Offset = {left: 0, top: 0};

  /**
   * If the `popover` is open
   */
  export let isVisible = false;

  /**
   * The container which the popover is constrained by
   */
  export let container: HTMLElement | undefined = undefined;

  let popover: HTMLElement | undefined = undefined;
  let position: Offset = {left: 0, top: 0};

  function calculatePosition(): Offset {
    if (!popover || !anchor) {
      return position;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const containerRect = container
      ? container.getBoundingClientRect()
      : {
          top: 0,
          left: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
        };

    const anchorOffset = rectPointOffset(anchorRect, attachAt);
    const popoverOffset = rectPointOffset(popoverRect, popoverOrigin);

    let left = anchorRect.left + anchorOffset.left - popoverOffset.left + offset.left;
    let top = anchorRect.top + anchorOffset.top - popoverOffset.top + offset.top;

    // Ensure popover is inside container
    left = Math.min(Math.max(left, containerRect.left), containerRect.right - popoverRect.width);
    top = Math.min(Math.max(top, containerRect.top), containerRect.bottom - popoverRect.height);

    return {left, top};
  }

  function updatePosition(): void {
    if (!isVisible) {
      return;
    }

    position = calculatePosition();
  }

  $: {
    if (popover !== undefined || anchor !== undefined) {
      updatePosition();
    }
  }

  onMount(() => {
    window.addEventListener('resize', updatePosition);
  });

  onDestroy(() => {
    window.removeEventListener('resize', updatePosition);
  });
</script>

<template>
  {#if isVisible}
    <div
      class="popover"
      bind:this={popover}
      style="left: {position.left}px; top: {position.top}px;"
    >
      <slot />
    </div>
  {/if}
</template>

<style>
  .popover {
    position: absolute;
    z-index: 1000;
  }
</style>
