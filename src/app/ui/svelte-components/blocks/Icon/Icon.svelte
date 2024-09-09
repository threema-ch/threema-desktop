<script lang="ts">
  /**
   * Let the icon appear disabled.
   */
  export let disabled = false;

  /**
   * Font to be used.
   */
  export let font: string;

  /**
   * Optional title of the icon
   */
  export let title = '';
</script>

<template>
  <span class="icon" {title} class:disabled style:--c-t-font-family="'{font}'">
    <slot>info</slot>
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--c-t-font-family);

  .icon {
    font-size: var(--c-icon-font-size, unset);
    font-family: var($-temp-vars, --c-t-font-family);
    font-weight: normal;
    font-style: normal;
    display: inline-block;
    line-height: 1em;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;
    opacity: var(--c-icon-opacity, default);

    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    -moz-osx-font-smoothing: grayscale;

    &.disabled {
      opacity: var(--c-icon-opacity--disabled, default);
    }
  }
</style>
