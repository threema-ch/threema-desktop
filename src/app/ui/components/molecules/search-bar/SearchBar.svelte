<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import type {SearchBarProps} from '~/app/ui/components/molecules/search-bar/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = SearchBarProps;

  // eslint-disable-next-line func-style
  export let onRequestRefresh: NonNullable<$$Props['onRequestRefresh']> = () => {};
  export let placeholder: NonNullable<$$Props['placeholder']> = '';
  export let term: NonNullable<$$Props['term']> = '';

  const dispatch = createEventDispatcher<{
    clear: undefined;
  }>();

  let inputElement: HTMLInputElement;

  /**
   * Remove focus from the input element.
   */
  export function blur(): void {
    inputElement.blur();
  }

  /**
   * Set focus to the input element.
   */
  export function focus(): void {
    inputElement.focus();
  }

  /**
   * Set focus to the input element and select its contents.
   */
  export function focusAndSelect(): void {
    inputElement.select();
  }

  function clear(): void {
    term = '';
    dispatch('clear');
  }

  function clearAndBlur(): void {
    clear();
    blur();
  }

  function clearAndFocus(): void {
    clear();
    focus();
  }

  // Reset the value when the `esc` key is pressed, refresh on `enter`.
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      clearAndFocus();
    }
    if (event.key === 'Enter') {
      onRequestRefresh();
    }
  }
</script>

<div class="container" class:has-value={term.length > 0}>
  <button class="action" data-icon={term.length > 0 ? 'back' : 'search'} on:click={clearAndBlur}>
    <MdIcon theme="Outlined">
      {#if term.length > 0}
        arrow_back
      {:else}
        search
      {/if}
    </MdIcon>
  </button>

  <input
    bind:this={inputElement}
    bind:value={term}
    {placeholder}
    spellcheck="false"
    type="text"
    on:keydown={handleKeydown}
  />

  {#if term.length > 0}
    <button class="action" data-icon="reset" on:click={clearAndFocus}>
      <MdIcon theme="Outlined">close</MdIcon>
    </button>
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
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

      .action[data-icon='reset'] {
        display: grid;
      }
    }

    .action {
      @extend %neutral-input;

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
