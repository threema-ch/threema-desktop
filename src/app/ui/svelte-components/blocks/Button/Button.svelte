<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  /**
   * Whether the button is disabled.
   */
  export let disabled = false;

  /**
   * The desired button flavor.
   */
  export let flavor: 'filled' | 'naked';

  /**
   * The desired button size.
   */
  export let size: 'normal' | 'small' = 'normal';

  let button: HTMLElement | null = null;

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
    font-size: var($-temp-vars-size, --c-t-font-size);
    padding: var($-temp-vars-size, --c-t-padding);
    border: rem(1px) solid var($-temp-vars, --c-t-border-color);
    border-radius: rem(8px);
    background-color: var($-temp-vars, --c-t-background-color);
    color: var($-temp-vars, --c-t-text-color);

    &:not(:disabled) {
      cursor: pointer;

      &:hover {
        border-color: var($-temp-vars, --c-t-border-color--hover);
        @include def-var(
          $-temp-vars,
          --c-t-background-color,
          var($-temp-vars, --c-t-background-color--hover)
        );
      }

      &:focus-visible {
        border-color: var($-temp-vars, --c-t-border-color--focus);
        @include def-var(
          $-temp-vars,
          --c-t-background-color,
          var($-temp-vars, --c-t-background-color--hover)
        );
      }

      &:active {
        border-color: var($-temp-vars, --c-t-border-color--active);
        @include def-var(
          $-temp-vars,
          --c-t-background-color,
          var($-temp-vars, --c-t-background-color--active)
        );
      }
    }

    &:disabled {
      opacity: var($-temp-vars, --c-t-opacity--disabled);
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
