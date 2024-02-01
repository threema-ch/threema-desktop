<script lang="ts">
  /**
   * Predefined size to choose from.
   */
  export let mode: 'small' | 'large';
</script>

<template>
  <div data-mode={mode}>
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: flex;
    flex-direction: column;
    padding: em(8px) 0;
    min-width: var(--c-menu-container-min-width, auto);
    width: var(--c-menu-container-width, auto);
    max-width: var(--c-menu-container-max-width, auto);
    border-radius: em(4px);
    background-color: var(--c-menu-container-background-color, default);

    &[data-mode='small'] {
      @include def-var(
        (
            --c-menu-item-padding: var(--c-menu-container-small-item-padding, default),
            --c-menu-item-gap: var(--c-menu-container-small-item-gap, default),
            --c-icon-font-size: var(--c-menu-container-small-item-icon-size, default)
          )...
      );
    }

    &[data-mode='large'] {
      @include def-var(
        (
            --c-menu-item-padding: var(--c-menu-container-large-item-padding, default),
            --c-menu-item-gap: var(--c-menu-container-large-item-gap, default),
            --c-icon-font-size: var(--c-menu-container-large-item-icon-size, default)
          )...
      );
    }
  }
</style>
