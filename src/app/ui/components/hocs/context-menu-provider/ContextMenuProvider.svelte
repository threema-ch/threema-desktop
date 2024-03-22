<!--
  @component
  Provides the wrapped element with a popover that contains a context menu.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import type {ContextMenuProviderProps} from '~/app/ui/components/hocs/context-menu-provider/props';
  import type {
    ContextMenuItem,
    ContextMenuOption,
  } from '~/app/ui/components/hocs/context-menu-provider/types';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '~/app/ui/svelte-components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '~/app/ui/svelte-components/generic/Menu/MenuItem.svelte';
  import MenuItemDivider from '~/app/ui/svelte-components/generic/Menu/MenuItemDivider.svelte';

  type $$Props = ContextMenuProviderProps;

  export let afterClose: $$Props['afterClose'] = undefined;
  export let afterOpen: $$Props['afterOpen'] = undefined;
  export let anchorPoints: $$Props['anchorPoints'] = undefined;
  export let beforeClose: $$Props['beforeClose'] = undefined;
  export let beforeOpen: $$Props['beforeOpen'] = undefined;
  export let closeOnClickOutside: $$Props['closeOnClickOutside'] = undefined;
  export let container: $$Props['container'] = undefined;
  export let element: $$Props['element'] = undefined;
  export let flip: $$Props['flip'] = undefined;
  export let items: $$Props['items'];
  export let offset: $$Props['offset'] = undefined;
  export let popover: $$Props['popover'] = null;
  export let reference: $$Props['reference'] = undefined;
  export let triggerBehavior: $$Props['triggerBehavior'] = undefined;

  const dispatch = createEventDispatcher<{
    clickitem: ContextMenuOption;
  }>();

  function handleClickItem(item: ContextMenuItem): void {
    if (item === 'divider') {
      return;
    }

    dispatch('clickitem', item);
    item.handler();
  }
</script>

{#if items !== undefined && items.length > 0}
  <Popover
    bind:this={popover}
    {afterClose}
    {afterOpen}
    {anchorPoints}
    {beforeClose}
    {beforeOpen}
    {closeOnClickOutside}
    {container}
    {element}
    {flip}
    {offset}
    {reference}
    {triggerBehavior}
    on:clicktrigger
    on:hasclosed
    on:hasopened
    on:willclose
    on:willopen
  >
    <div class="trigger" slot="trigger">
      <slot />
    </div>

    <div class="menu" slot="popover">
      <MenuContainer mode="small">
        {#each items as item}
          {#if item === 'divider'}
            <MenuItemDivider />
          {:else if item.icon !== undefined}
            <MenuItem on:click={() => handleClickItem(item)} disabled={item.disabled}>
              <span class={`icon ${item.icon.color}`} slot="icon">
                <MdIcon theme={item.icon.filled === true ? 'Filled' : 'Outlined'}
                  >{item.icon.name}</MdIcon
                >
              </span>
              <span>{item.label}</span>
            </MenuItem>
          {:else}
            <MenuItem on:click={() => handleClickItem(item)} disabled={item.disabled}>
              <span>{item.label}</span>
            </MenuItem>
          {/if}
        {/each}
      </MenuContainer>
    </div>
  </Popover>
{:else}
  <slot />
{/if}

<style lang="scss">
  @use 'component' as *;

  .menu {
    @extend %elevation-060;

    --c-menu-container-min-width: #{rem(180px)};

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
