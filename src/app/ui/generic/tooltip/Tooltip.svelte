<script lang="ts">
  import {fade} from 'svelte/transition';
  import {createPopperActions} from 'svelte-popperjs';

  import {type u32} from '~/common/types';

  export let padding: {
    right?: u32;
    left?: u32;
    top?: u32;
    bottom?: u32;
  } = {};

  const [popperRef, popperContent] = createPopperActions({
    placement: 'bottom',
    strategy: 'absolute',
  });

  const extraOpts = {
    placement: 'bottom' as const,
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 10],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding,
        },
      },
    ],
  };

  let showMenu = false;

  function handleClick(): void {
    showMenu = !showMenu;
  }
</script>

<template>
  <div class="trigger" use:popperRef on:click={handleClick}>
    <slot name="trigger" />
  </div>

  {#if showMenu}
    <div class="tooltip" use:popperContent={extraOpts} transition:fade={{duration: 200}}>
      <slot name="tooltip" />
    </div>
  {/if}
</template>
