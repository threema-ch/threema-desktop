<script lang="ts">
  import SVGThreemaIcon from '~/app/res/icon/icon-welcome.svg?raw';
  import type {AppServices} from '~/app/types';
  import {display} from '~/common/dom/ui/state';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let services: AppServices;
  unusedProp(services);
</script>

<div class="welcome">
  <span data-display={$display}>
    <!-- Note: Safe because icon SVG is static. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html SVGThreemaIcon}
  </span>
</div>

<style lang="scss">
  @use 'component' as *;

  .welcome {
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
