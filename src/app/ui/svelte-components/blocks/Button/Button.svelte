<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';

  /**
   * Whether the button is disabled.
   */
  export let disabled = false;

  /**
   * The desired button flavor.
   */
  export let flavor: 'filled' | 'naked';

  /**
   * Whether to display a loading spinner next to the label. Note: This won't have any effect on
   * whether the button is disabled, so it's recommended to set the button manually to `disabled`
   * while loading is active in most cases.
   */
  export let isLoading: boolean = false;

  /**
   * The desired button size.
   */
  export let size: 'normal' | 'small' = 'normal';

  let button: HTMLElement | null = null;

  /**
   * Change focus to this button.
   */
  export function focus(): void {
    if (!disabled) {
      button?.focus();
    }
  }

  interface ElementReadyEvent {
    readonly element: HTMLElement;
  }

  const dispatch = createEventDispatcher<{
    elementReady: ElementReadyEvent;
  }>();

  $: if (button !== null) {
    dispatch('elementReady', {element: button});
  }
</script>

<template>
  <button
    bind:this={button}
    on:click
    on:keyup
    on:keydown
    on:focus
    on:blur
    data-flavor={flavor}
    data-size={size}
    {disabled}
    {...$$restProps}
    type="button"
  >
    {#if isLoading}
      <div class="progress">
        <CircularProgress
          variant="indeterminate"
          color={flavor === 'filled' ? 'white' : 'default'}
        />
      </div>
    {/if}

    <slot />
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  $-vars: (
    border-color,
    background-color,
    text-color,
    background-color--hover,
    background-color--active,
    border-color--hover,
    border-color--focus,
    border-color--active,
    opacity--disabled
  );
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  $-vars-size: (padding, font-size);
  $-temp-vars-size: format-each($-vars-size, $prefix: --c-t-);

  button {
    @extend %neutral-input;

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: rem(8px);

    font-size: var($-temp-vars-size, --c-t-font-size);
    padding: var($-temp-vars-size, --c-t-padding);
    border: rem(1px) solid var($-temp-vars, --c-t-border-color);
    border-radius: rem(8px);
    background-color: var($-temp-vars, --c-t-background-color);
    color: var($-temp-vars, --c-t-text-color);

    .progress {
      height: rem(20px);
      width: rem(20px);
    }

    &:not(:disabled) {
      cursor: pointer;

      &:hover {
        @include def-var(
          $-temp-vars,
          --c-t-background-color,
          var($-temp-vars, --c-t-background-color--hover)
        );

        border-color: var($-temp-vars, --c-t-border-color--hover);
      }

      &:focus-visible {
        @include def-var(
          $-temp-vars,
          --c-t-background-color,
          var($-temp-vars, --c-t-background-color--hover)
        );

        border-color: var($-temp-vars, --c-t-border-color--focus);
      }

      &:active {
        @include def-var(
          $-temp-vars,
          --c-t-background-color,
          var($-temp-vars, --c-t-background-color--active)
        );

        border-color: var($-temp-vars, --c-t-border-color--active);
      }
    }

    &:disabled {
      background-color: color-mix(
        in srgb,
        var($-temp-vars, --c-t-background-color) var($-temp-vars, --c-t-opacity--disabled),
        transparent
      );
      border-color: transparent;
      color: color-mix(
        in srgb,
        var($-temp-vars, --c-t-text-color) var($-temp-vars, --c-t-opacity--disabled),
        transparent
      );

      &:hover {
        cursor: not-allowed;
      }
    }
  }

  @include def-mapped-flavor-vars(
    $-temp-vars,
    map-get-req($config, button-flavors),
    $-vars,
    $set-prefix: --c-t-,
    $get-prefix: --c-button-
  );

  @include def-mapped-size-vars(
    $-temp-vars-size,
    map-get-req($config, button-sizes),
    $-vars-size,
    $set-prefix: --c-t-,
    $get-prefix: --c-button-
  );
</style>
