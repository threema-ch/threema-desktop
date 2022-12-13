<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import {ElementResizeObserver} from '#3sc/utils/observer';
  import {type SwipeAreaGroup} from '~/app/ui/generic/swipe-area';

  /**
   * Optional swipe area group. Grouped swipe areas will reset each other on
   * swipe.
   */
  export let group: SwipeAreaGroup | undefined = undefined;

  // Recalculate origin and reset back to it on resize
  const observer = new ElementResizeObserver(() => {
    origin = left?.getBoundingClientRect().width ?? 0;
    reset();
  }, onDestroy);

  let container: HTMLDivElement;
  let left: HTMLDivElement | undefined = undefined;
  let area: 'left' | 'right' | 'both';
  let origin = 0;

  /**
   * Scroll back to the original position, i.e. showing the main content.
   *
   * @param behavior Optional scrolling behaviour.
   */
  export function reset(behavior?: 'smooth'): void {
    if (container.scrollLeft !== origin) {
      container.scrollTo({
        behavior,
        left: origin,
      });
    }
  }

  onMount(() => {
    // Determine origin (start offset of 'main')
    origin = left?.getBoundingClientRect().width ?? 0;

    // Determine swipe area(s)
    if ($$slots.left !== undefined && $$slots.right !== undefined) {
      area = 'both';
    } else if ($$slots.left !== undefined) {
      area = 'left';
    } else if ($$slots.right !== undefined) {
      area = 'right';
    } else {
      throw new Error(`No swipe area set, got: ${Object.keys($$slots)}`);
    }

    // Watch for resize events on the container
    observer.set(container);

    // Remove self from group on destruction
    return () => group?.remove(reset);
  });
</script>

<template>
  <div
    bind:this={container}
    class="container"
    data-swipe-area={area}
    on:wheel={() => group?.replace(reset)}
    on:pointerdown={() => group?.replace(reset)}
  >
    <div on:click={() => reset('smooth')} class="main">
      <slot name="main" />
    </div>
    {#if $$slots.left !== undefined}
      <div bind:this={left} class="left">
        <slot name="left" />
      </div>
    {/if}
    {#if $$slots.right !== undefined}
      <div class="right">
        <slot name="right" />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    scroll-snap-type: x mandatory;
    overflow-x: scroll;
    user-select: none;
    width: 100%;

    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    &[data-swipe-area='left'] {
      grid-template:
        'left main'
        / var(--ic-swipe-area-left-size) var(--ic-swipe-area-main-size);
    }

    &[data-swipe-area='right'] {
      grid-template:
        'main right'
        / var(--ic-swipe-area-main-size) var(--ic-swipe-area-right-size);
    }

    &[data-swipe-area='both'] {
      grid-template:
        'left main right'
        / var(--ic-swipe-area-left-size) var(--ic-swipe-area-main-size) var(--ic-swipe-area-right-size);
    }
  }

  %-content {
    scroll-snap-align: start;
  }
  .main {
    @extend %-content;
    grid-area: main;
  }
  .left {
    @extend %-content;
    grid-area: left;
  }
  .right {
    @extend %-content;
    grid-area: right;
  }
</style>
