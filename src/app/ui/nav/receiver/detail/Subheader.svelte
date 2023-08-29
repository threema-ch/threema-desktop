<script lang="ts">
  /**
   * The label.
   */
  export let label: string;
</script>

<template>
  <div class="subheader">
    <span class="label">{label}</span>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .subheader {
    padding: rem(10px) rem(16px) rem(4px);

    .label {
      @extend %font-small-400;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2.4px;
    }
  }
</style>
