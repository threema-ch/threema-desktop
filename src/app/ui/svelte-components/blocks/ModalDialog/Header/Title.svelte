<script lang="ts">
  export let title: string;
</script>

<template>
  <div class="header">
    <div class="title">{title}</div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .header {
    padding: rem(16px);
    display: grid;
    grid-template: 'text' auto / 1fr;
    place-items: center;

    .title {
      @extend %font-large-400;
      text-align: left;
      width: 100%;
    }
  }
</style>
