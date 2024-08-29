<!--
  @component
  Provides the wrapped element with a popover that contains a context menu.
-->
<script lang="ts" generics="THandlerProps = undefined">
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
  import {hasProperty} from '~/common/utils/object';

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = ContextMenuProviderProps<THandlerProps>;

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
  export let safetyGap: $$Props['safetyGap'] = {left: 8, right: 8, top: 8, bottom: 8};
  export let triggerBehavior: $$Props['triggerBehavior'] = undefined;

  const dispatch = createEventDispatcher<{
    // See comment for `$$Props`.
    // eslint-disable-next-line no-undef
    clickitem: ContextMenuOption<THandlerProps>;
  }>();

  // See comment for `$$Props`.
  // eslint-disable-next-line no-undef
  function handleClickItem(item: ContextMenuItem<THandlerProps>): void {
    if (item.type === 'divider' || item.type === 'heading') {
      return;
    }

    dispatch('clickitem', item);
    if (hasProperty(item, 'handlerProps')) {
      item.handler(item.handlerProps);
    } else {
      item.handler();
    }
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
    {safetyGap}
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
        {@const hasAnyIcon = items.some(
          (item) => item.type !== 'divider' && item.icon !== undefined,
        )}

        {#each items as item}
          {#if item.type === 'divider'}
            <MenuItemDivider />
          {:else if item.type === 'heading'}
            <span class="heading">
              {#if item.icon !== undefined}
                <span class="icon">
                  <MdIcon theme={item.icon.filled === true ? 'Filled' : 'Outlined'}
                    >{item.icon.name}</MdIcon
                  >
                </span>
              {/if}
              <span class="label">{item.text}</span>
            </span>
          {:else if item.icon !== undefined}
            <MenuItem on:click={() => handleClickItem(item)} disabled={item.disabled}>
              <span class={`icon ${item.icon.color}`} slot="icon">
                <MdIcon theme={item.icon.filled === true ? 'Filled' : 'Outlined'}
                  >{item.icon.name}</MdIcon
                >
              </span>
              <span class="label">{item.label}</span>
            </MenuItem>
          {:else}
            <MenuItem on:click={() => handleClickItem(item)} disabled={item.disabled}>
              <span class="label" class:padded={hasAnyIcon}>{item.label}</span>
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

    .heading {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: start;
      gap: var(--c-menu-item-gap, default);

      padding: var(--c-menu-item-padding, default);

      .icon {
        flex: 0 0 auto;
      }

      .label {
        flex-grow: 1 1 auto;
      }
    }

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

    .label {
      line-height: rem(18px);

      &.padded {
        padding-left: rem(18px + 8px);
      }
    }
  }
</style>
