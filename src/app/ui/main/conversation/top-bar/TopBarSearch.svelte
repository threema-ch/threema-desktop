<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';

  const dispatch = createEventDispatcher();

  /**
   * Placeholder of the search field.
   */
  export let placeholder: string;

  /**
   * Search string of the search field.
   */
  export let value = '';

  // The search input itself
  let input: HTMLInputElement;

  // Handle shortcuts
  function close(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      value = '';
      dispatch('close');
    }
  }

  onMount(() => {
    input.focus();
  });
</script>

<template>
  <div>
    <input on:keydown={close} bind:this={input} {placeholder} type="text" bind:value />
    {#if value.length > 0}
      <IconButton
        on:click={() => {
          value = '';
          input.focus();
        }}
        flavor="naked"
      >
        <MdIcon theme="Outlined">close</MdIcon>
      </IconButton>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: grid;
    grid-template:
      'search actions' #{rem(40px)}
      / 1fr auto;
    column-gap: rem(8px);

    input {
      @extend %neutral-input;
      width: 100%;
      height: 100%;

      &::placeholder {
        color: var(--cc-search-input-placeholder-text-color, inherit);
      }
    }
  }
</style>
