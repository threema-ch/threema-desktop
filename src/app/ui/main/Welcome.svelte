<script lang="ts">
  import SVGThreemaIcon from '~/app/res/icon/icon-welcome.svg?raw';
  import {display} from '~/common/dom/ui/state';
</script>

<template>
  <div>
    <span data-display={$display}>
      {@html SVGThreemaIcon}
    </span>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: grid;
    place-items: center;
    span {
      width: rem(80px);
      height: rem(93px);
      &[data-display='large'] {
        width: rem(120px);
        height: rem(139px);
      }
      display: inline-block;
      :global(svg .fill-opacity) {
        fill-opacity: var(--t-main-welcome-icon-fill-opacity);
      }
    }
  }
</style>
