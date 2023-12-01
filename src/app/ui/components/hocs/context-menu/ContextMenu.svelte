<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import MenuItemDivider from 'threema-svelte-components/src/components/generic/Menu/MenuItemDivider.svelte';
  import type {ContextMenuProps} from '~/app/ui/components/hocs/context-menu/props';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';

  type $$Props = ContextMenuProps;

  // We dispatch an event before callback
  // so that the popover and the callback can be provided from different components
  // for example, the popover can come from KeyValueList.ItemWithDropdown
  // while the callback is provided by the parent component of such
  const dispatch = createEventDispatcher<{
    elementchosen: undefined;
  }>();

  export let popover: $$Props['popover'];
  export let reference: $$Props['reference'];
  export let boundary: $$Props['boundary'];
  export let anchorPoints: $$Props['anchorPoints'];
  export let handleBeforeOpen: $$Props['handleBeforeOpen'] = undefined;
  export let items: $$Props['items'];
  export let offset: $$Props['offset'];
  export let triggerBehavior: $$Props['triggerBehavior'];

  function onElementChosen(item: ContextMenuItem): void {
    if (item === 'divider') {
      return;
    }
    dispatch('elementchosen');
    item.handler();
  }
</script>

<template>
  <Popover
    bind:this={popover}
    {reference}
    container={boundary ?? undefined}
    {anchorPoints}
    {offset}
    {triggerBehavior}
    beforeOpen={handleBeforeOpen}
    on:clicktrigger
    on:hasclosed
    on:hasopened
    on:willclose
    on:willopen
  >
    <div class="trigger" slot="trigger">
      <slot name="trigger" />
    </div>
    <div class="menu" slot="popover">
      <MenuContainer mode="small">
        {#each items as item}
          {#if item === 'divider'}
            <MenuItemDivider />
          {:else if item.icon !== undefined}
            <MenuItem on:click={() => onElementChosen(item)}>
              <span class={`icon ${item.icon.color}`} slot="icon">
                <MdIcon theme={item.icon.filled === true ? 'Filled' : 'Outlined'}
                  >{item.icon.label}</MdIcon
                >
              </span>
              <span>{item.label}</span>
            </MenuItem>
          {:else}
            <MenuItem on:click={() => onElementChosen(item)}>
              <span>{item.label}</span>
            </MenuItem>
          {/if}
        {/each}
      </MenuContainer>
    </div>
  </Popover>
</template>

<style lang="scss">
  @use 'component' as *;

  .menu {
    --c-menu-container-min-width: #{rem(180px)};
    @extend %elevation-060;

    .icon {
      display: flex;
      align-items: center;

      &.acknowledged {
        color: var(--mc-message-status-acknowledged-color);
      }

      &.declined {
        color: var(--mc-message-status-declined-color);
      }
    }
  }
</style>
