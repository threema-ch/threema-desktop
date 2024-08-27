<script lang="ts">
  import type {AppServicesForSvelte} from '~/app/types';
  import Logo from '~/app/ui/components/partials/logo/Logo.svelte';
  import {display} from '~/common/dom/ui/state';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let services: AppServicesForSvelte;
  unusedProp(services);
</script>

<div class="welcome">
  <span data-display={$display}>
    <Logo />
  </span>
</div>

<style lang="scss">
  @use 'component' as *;

  .welcome {
    display: grid;
    place-items: center;

    span {
      display: inline-block;
      width: rem(96px);
      height: rem(193px);
      color: var(--t-main-welcome-icon-color);

      &[data-display='large'] {
        width: rem(120px);
        height: rem(139px);
      }
    }
  }
</style>
