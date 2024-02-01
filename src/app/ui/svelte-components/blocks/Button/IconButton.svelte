<script lang="ts">
  /**
   * Whether the button is disabled.
   */
  export let disabled = false;

  /**
   * The desired button flavor.
   */
  export let flavor: 'filled' | 'outlined' | 'naked' | 'overlay';
</script>

<template>
  <button
    on:click
    on:keydown
    on:keyup
    data-flavor={flavor}
    {disabled}
    {...$$restProps}
    type="button"
  >
    <div class="circle">
      <div class="icon">
        <slot />
      </div>
      <slot name="overlay" />
    </div>
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  $-vars: (
    background-color,
    border-color,
    icon-color,
    outer-background-color--hover,
    outer-background-color--focus,
    outer-background-color--active,
    outer-border-color--focus,
    opacity--disabled
  );
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  button {
    @extend %neutral-input;
    display: grid;
    place-items: center;
    border-radius: 50%;
    user-select: none;
    border: solid 1px transparent;
    padding: var(--c-icon-button-outer-padding, default);

    .circle {
      position: relative;
      display: grid;
      place-items: center;
      padding: var(--c-icon-button-padding, default);
      background-color: var($-temp-vars, --c-t-background-color);
      border: solid em(2px) var($-temp-vars, --c-t-border-color);
      border-radius: 50%;

      .icon {
        display: grid;
        place-items: center;
        font-size: var(--c-icon-button-icon-size, default);
        color: var($-temp-vars, --c-t-icon-color);
      }
    }

    &:not(:disabled) {
      cursor: pointer;

      &:hover {
        background-color: var($-temp-vars, --c-t-outer-background-color--hover);
      }

      &:focus-visible {
        background-color: var($-temp-vars, --c-t-outer-background-color--focus);
        border: solid em(1px) var($-temp-vars, --c-t-outer-border-color--focus);
      }

      &:active {
        background-color: var($-temp-vars, --c-t-outer-background-color--active);
      }
    }

    // Disabled state
    &:disabled {
      opacity: var($-temp-vars, --c-t-opacity--disabled);
    }
  }

  @include def-mapped-flavor-vars(
    $-temp-vars,
    map-get-req($config, icon-button-flavors),
    $-vars,
    $set-prefix: --c-t-,
    $get-prefix: --c-icon-button-
  );
</style>
