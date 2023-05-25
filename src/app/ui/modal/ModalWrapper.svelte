<script lang="ts">
  import {onDestroy} from 'svelte';

  import {globals} from '~/app/globals';

  const hotkeyManager = globals.unwrap().hotkeyManager;

  export let visible = true;
  export let suspendHotkeysWhenVisible = true;

  function handleVisibilityChange(value: boolean): void {
    if (!suspendHotkeysWhenVisible) {
      return;
    }

    if (value) {
      hotkeyManager.suspend();
    } else {
      hotkeyManager.resume();
    }
  }

  $: handleVisibilityChange(visible);

  onDestroy(() => {
    handleVisibilityChange(false);
  });
</script>

<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: contents;
    --c-global-overlay-background: var(--cc-modal-dialog-background-color);
  }
</style>
