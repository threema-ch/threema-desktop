<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import type {Dimensions} from '~/app/ui/svelte-components/types';
  import {unwrap} from '~/app/ui/svelte-components/utils/assert';
  import {ElementResizeObserver} from '~/app/ui/svelte-components/utils/observer';

  /**
   * The dimensions of the box which will be updated on resize events.
   */
  export let dimensions: Dimensions = {width: 0, height: 0};

  // Observe the box and update dimensions on resize
  const observer = new ElementResizeObserver((info) => {
    const size = unwrap(info.contentBoxSize[0]);
    dimensions = {width: size.inlineSize, height: size.blockSize};
  }, onDestroy);
  let element: HTMLElement | null = null;
  onMount(() => observer.set(unwrap(element)));
</script>

<template>
  <div bind:this={element}>
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  // Attempt to mimic the surrounding box since `display: contents`
  // unfortunately is not obversable.
  div {
    height: inherit;
    width: inherit;
    overflow: inherit;
    display: inherit;
    grid: inherit;
    flex: inherit;
    place-items: inherit;
  }
</style>
