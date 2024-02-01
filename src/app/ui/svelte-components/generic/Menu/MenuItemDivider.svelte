<script lang="ts">
  // TS-Block is required for component usage in typescript import
</script>

<template>
  <hr />
</template>

<style lang="scss">
  @use 'component' as *;

  hr {
    border: none;
    border-top: solid em(1px) var(--c-menu-item-divider-color, default);
    margin: em(8px) 0;
  }
</style>
