<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  /**
   * Placeholder text.
   */
  export let placeholder: string;

  /**
   * Input box value.
   */
  export let value = '';

  /**
   * Function to call to request a refresh of search results.
   */
  export let refresh: (() => void) | undefined = undefined;

  // Input element
  let input: HTMLInputElement;

  const dispatch = createEventDispatcher<{
    reset: undefined;
  }>();

  // Reset the value, then blur
  function back(): void {
    value = '';
    input.blur();
  }

  // Reset the value
  function reset(): void {
    value = '';
    input.focus();
    dispatch('reset');
  }

  // Reset the value when the `esc` key is pressed, refresh on `enter`.
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      reset();
    }
    if (event.key === 'Enter') {
      refresh?.();
    }
  }

  /**
   * Set focus into the input
   */
  export function focus(): void {
    input.focus();
  }

  /**
   * Select text
   */
  export function select(): void {
    input.select();
  }
</script>

<template>
  <div class="search" class:has-value={value.length > 0}>
    <div class="icon" data-icon={value.length > 0 ? 'back' : 'search'} on:click={back}>
      <MdIcon theme="Outlined">
        {#if value.length > 0}arrow_back{:else}search{/if}
      </MdIcon>
    </div>
    <input
      type="text"
      {placeholder}
      bind:this={input}
      spellcheck="false"
      bind:value
      on:keydown={handleKeydown}
      {...$$restProps}
    />
    {#if value.length > 0}
      <div class="icon" data-icon="reset" on:pointerdown|preventDefault={reset}>
        <MdIcon theme="Outlined">close</MdIcon>
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .search {
    background-color: var(--cc-search-input-background-color, inherit);
    border-radius: rem(8px);
    display: grid;
    grid-template:
      'icon-left input icon-right'
      / auto 1fr;
    gap: rem(8px);
    place-items: center;

    &:hover {
      background-color: var(--cc-search-input-background-color--hover, inherit);
    }

    &:focus-within {
      background-color: var(--cc-search-input-background-color--focus, inherit);
    }

    &.has-value {
      grid-template:
        'icon-left input icon-right'
        / auto 1fr auto;

      .icon[data-icon='reset'] {
        display: grid;
      }
    }

    .icon {
      color: var(--cc-search-input-icon-color, inherit);
      padding: rem(8px);
      font-size: em(24px);
      user-select: none;
      display: grid;
      place-items: center;

      &:hover:not([data-icon='search']) {
        color: var(--cc-search-input-icon-color--hover, inherit);
        cursor: pointer;
      }

      &[data-icon='reset'] {
        display: none;
      }
    }

    input {
      @extend %neutral-input;
      color: var(--cc-search-input-text-color, inherit);
      width: 100%;
      height: 100%;

      &::placeholder {
        color: var(--cc-search-input-placeholder-text-color, inherit);
      }
    }
  }
</style>
