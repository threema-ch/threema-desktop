<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ContextMenu from '~/app/ui/components/hocs/context-menu/ContextMenu.svelte';
  import {provideContextMenuEntries} from '~/app/ui/components/partials/main-nav-bar/internal/context-menu-provider/helpers';
  import type {ContextMenuProviderProps} from '~/app/ui/components/partials/main-nav-bar/internal/context-menu-provider/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = ContextMenuProviderProps;
  export let services: $$Props['services'];
  const {router} = services;
  const items = provideContextMenuEntries(router, $i18n);
  let popover: SvelteNullableBinding<Popover> = null;
</script>

<template>
  <ContextMenu
    bind:popover
    {items}
    anchorPoints={{
      reference: {
        horizontal: 'right',
        vertical: 'bottom',
      },
      popover: {
        horizontal: 'right',
        vertical: 'top',
      },
    }}
    offset={{
      left: 0,
      top: 4,
    }}
    handleBeforeOpen={undefined}
    reference={undefined}
    boundary={undefined}
    triggerBehavior="toggle"
    on:elementchosen={() => popover?.close()}
  >
    <IconButton slot="trigger" flavor="naked">
      <MdIcon theme="Outlined">more_vert</MdIcon>
    </IconButton>
  </ContextMenu>
</template>
