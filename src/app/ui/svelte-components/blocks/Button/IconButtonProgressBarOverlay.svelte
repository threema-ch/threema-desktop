<script lang="ts">
  import type {CircularProgressVariant} from '#3sc/components/blocks/CircularProgress';
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';

  /**
   * The variant of the progress indicator to show.
   */
  export let variant: CircularProgressVariant = 'indeterminate';

  /**
   * Progress percentage value to be used. This will be ignored if variant
   * is 'indeterminate'.
   */
  export let value = 0;
</script>

<template>
  <div>
    <CircularProgress {variant} {value} />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: em(1px);

    @include def-var(
      (
          --c-circular-progress-stroke-color:
            var(--c-icon-button-progress-bar-overlay-color, default),
          --c-circular-progress-thickness: #{em(4px)}
        )...
    );
  }
</style>
