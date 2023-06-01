<script lang="ts">
  export let label: string | undefined = undefined;
  export let value: string;
</script>

<template>
  <div class="text" data-label={label !== undefined}>
    <div class="wrapper">
      {#if label !== undefined}
        <div class="label">{label}</div>
      {/if}
      <div class="value">{value}</div>
    </div>
    <div class="icon" />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .text {
    display: grid;
    height: rem(56px);
    grid-template:
      'wrapper icon'
      / 1fr min-content;
    column-gap: rem(8px);
    padding: rem(10px) rem(16px) rem(10px) rem(16px);

    .wrapper {
      grid-area: wrapper;

      .label {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }

      .value {
        user-select: all;
      }
    }

    .icon {
      grid-area: icon;
      display: grid;
      place-items: center;
    }
  }
</style>
