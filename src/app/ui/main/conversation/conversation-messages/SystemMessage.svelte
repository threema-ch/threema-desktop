<script lang="ts">
  // Void
</script>

<template>
  <div class="system-message" data-slot-icon={$$slots.icon}>
    {#if $$slots.icon}
      <div class="icon"><slot name="icon" /></div>
    {/if}
    <div class="content"><slot /></div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .system-message {
    display: grid;
    grid-template: 'content';
    place-items: center;
    color: var(--t-text-e2-color);
    margin: 0px auto;
    user-select: none;

    .content {
      grid-area: content;
      @extend %font-small-400;
    }

    .icon {
      grid-area: icon;
      display: grid;
      place-items: center;
      margin-right: rem(4px);
      font-size: rem(16px);
    }

    &[data-slot-icon='true'] {
      grid-template: 'icon content' auto / min-content max-content;
    }
  }
</style>
