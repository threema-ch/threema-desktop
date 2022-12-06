<script lang="ts">
  /**
   * The label.
   */
  export let label: string;

  /**
   * Temporary wip flag
   */
  export let wip = false;
</script>

<template>
  <div on:click class="link-element" class:has-icon-right={$$slots['icon-right']} class:wip>
    <div class="icon-left">
      <slot name="icon-left" />
    </div>
    <div class="label">{label}</div>
    <div class="icon-right">
      <slot name="icon-right" />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .link-element {
    display: grid;
    grid-template:
      'icon-left label icon-right' auto
      / min-content 1fr min-content;
    column-gap: rem(12px);
    align-items: center;
    height: rem(48px);
    padding: 0 rem(16px);
    cursor: pointer;
    user-select: none;

    .icon-left {
      grid-area: icon-left;
      display: grid;
      place-items: center;
      --c-icon-font-size: #{rem(24px)};
      color: var(--ic-list-element-color);
    }

    .label {
      grid-area: label;
      display: grid;
      align-items: center;
    }

    &:not(.has-icon-right) {
      .label {
        color: var(--ic-list-element-color);
      }
    }

    .icon-right {
      grid-area: icon-right;
      display: grid;
      place-items: center;
      --c-icon-font-size: #{rem(24px)};
      color: var(--ic-list-element-color);
    }

    &:hover {
      background-color: var(--ic-list-element-background-color--hover);
    }
  }
</style>
