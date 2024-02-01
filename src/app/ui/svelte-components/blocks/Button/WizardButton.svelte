<script lang="ts">
  /**
   * Whether the button is disabled.
   */
  export let disabled = false;
</script>

<template>
  <button on:click on:keyup on:keydown {disabled} {...$$restProps} type="button">
    <slot />
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  button {
    @extend %neutral-input;
    @extend %font-large-400;
    font-size: var(--c-wizard-button-font-size);
    padding: em(12px) em(24px);
    border: em(1px) solid var(--c-wizard-button-border-color);
    border-radius: em(8px);
    background-color: var(--c-wizard-button-background-color);
    color: var(--c-wizard-button-text-color);
    white-space: nowrap;

    &:not(:disabled) {
      cursor: pointer;

      &:hover {
        border-color: var(--c-wizard-button-border-color--hover);
        background-color: var(--c-wizard-button-background-color--hover);
      }

      &:focus-visible {
        border-color: var(--c-wizard-button-border-color--focus);
        background-color: var(--c-wizard-button-background-color--focus);
      }

      &:active {
        border-color: var(--c-wizard-button-border-color--active);
        background-color: var(--c-wizard-button-background-color--active);
      }
    }

    &:disabled {
      opacity: var(--c-wizard-button-opacity--disabled);
    }
  }
</style>
