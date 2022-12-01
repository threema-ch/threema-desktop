<script lang="ts">
  /**
   * The label.
   */
  export let label: string;

  /**
   * Temporary wip flag for unfinished features
   */
  export let wip = false;
</script>

<template>
  <div on:click class="list-element" class:has-icon={$$slots.icon} class:wip>
    <div class="label">{label}</div>
    <div class="value"><slot /></div>
    <div class="icon">
      <slot name="icon" />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .list-element {
    display: grid;
    grid-template:
      'label icon' auto
      'value icon' auto
      / 1fr min-content;
    height: rem(56px);
    padding: rem(10px) rem(16px);

    .label {
      @extend %font-small-400;
      color: var(--t-text-e2-color);
      grid-area: label;
    }

    .value {
      grid-area: value;
      margin-top: rem(-1px);
    }

    .icon {
      grid-area: icon;
      display: grid;
      place-items: center;
      user-select: none;
      color: var(--ic-list-element-color);
    }

    &.has-icon {
      cursor: pointer;
      &:hover {
        background-color: var(--ic-list-element-background-color--hover);
      }
    }
  }
</style>
