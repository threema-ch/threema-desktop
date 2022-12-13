<!--
  @component
  Wrapper around the context menu. It handles:

  - Opening and closing the menu
  - Positioning
  - Animations
  - Updating the {@link contextMenuStore} to ensure that only a single context menu is visible
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {fade} from 'svelte/transition';

  import {type u32} from '~/common/types';

  import {type ContextMenuDirectionX, contextMenuStore} from '.';

  /**
   * Position X of opening context menu
   */
  export let x: u32;
  /**
   * Position Y of opening context menu
   */
  export let y: u32;
  /**
   * Define horizontal direction of opened context menu
   */
  export let directionX: ContextMenuDirectionX = 'auto';

  export let contextGroup: HTMLElement | undefined = undefined;

  const dispatch = createEventDispatcher();

  // Determine if we should render the context menu
  let visible = false;

  // Svelte will set the element explicitly to null, if the element gets deleted.
  // eslint-disable-next-line @typescript-eslint/ban-types
  let wrapper: HTMLElement | null = null;

  /**
   * Close the context menu
   */
  export function close(): void {
    visible = false;
    // Remove any existing close function
    contextMenuStore.set(undefined);
  }

  /**
   * Open the context menu
   */
  export function open(event?: MouseEvent): void {
    if ($contextMenuStore !== undefined) {
      // Call the defined close function
      $contextMenuStore(event);
      // Remove the close function
      contextMenuStore.set(undefined);
    }
    visible = true;
    // Define a new close function
    contextMenuStore.set((mouseEvent?: MouseEvent) => {
      visible = false;
      dispatch('clickoutside', {
        isContextMenuMouseEventWithinContextGroup:
          isContextMenuMouseEventWithinContextGroup(mouseEvent),
      });
    });
  }

  // When the wrapper is assigned, set x and y coordinates
  $: if (wrapper !== null) {
    const rect = wrapper.getBoundingClientRect();
    const xCache = x;
    const xMinLeft = window.innerWidth - rect.width;

    if (directionX === 'auto') {
      x = Math.min(xMinLeft, x);
    }

    if (directionX === 'left' || (directionX === 'auto' && xMinLeft === x)) {
      if (directionX === 'auto') {
        // Revert to cached x, because we will
        // flip the context menu to the left side
        x = xCache;
      }
      // Flip the context menu start position.
      // Begin at right of context menu - floating left,
      // instead of beginning at left of context menu - floating right.
      x -= rect.width;
      if (x < 0) {
        // Prevent context menu floating out of left viewport,
        // because not enought space is left
        x = 0;
      }
    }

    if (y > window.innerHeight - rect.height) {
      // Flip the context menu start position.
      // Begin at bottom of context menu - floating top,
      // instead of beginning at top of context menu - floating down.
      y -= rect.height;
      if (y < 0) {
        // Prevent context menu floating out of top viewport,
        // because not enought space is left
        y = 0;
      }
    }
  }

  function isContextMenuMouseEventWithinContextGroup(mouseEvent: MouseEvent | undefined): boolean {
    if (mouseEvent === undefined || contextGroup === undefined) {
      return false;
    }

    if (mouseEvent.type !== 'contextmenu') {
      return false;
    }

    return mouseEvent.target === contextGroup || contextGroup.contains(mouseEvent.target as Node);
  }

  function onPageClick(event: MouseEvent): void {
    if (!visible) {
      return;
    }

    if (wrapper === null) {
      // Wrapper is not visible (was removed by svelte)
      return;
    }

    if (event.target === wrapper || wrapper.contains(event.target as Node)) {
      // Ignore clicks inside wrapper
      return;
    }

    dispatch('clickoutside', {
      isContextMenuMouseEventWithinContextGroup: isContextMenuMouseEventWithinContextGroup(event),
    });
  }
</script>

<svelte:body on:click={onPageClick} />

<template>
  {#if visible}
    <div
      transition:fade={{duration: 100}}
      bind:this={wrapper}
      on:contextmenu|preventDefault
      style:left={`${x}px`}
      style:top={`${y}px`}
    >
      <slot />
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    position: absolute;
    z-index: $z-index-context-menu;
    background-color: var(--c-modal-dialog-background-color);
    @extend %elevation-060;
    overflow-y: auto;
    max-height: 100vh;
  }
</style>
