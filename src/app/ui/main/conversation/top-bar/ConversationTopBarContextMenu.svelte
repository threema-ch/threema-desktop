<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import ContextMenuWrapper from '~/app/ui/generic/context-menu/ContextMenuWrapper.svelte';
  import {type u32} from '~/common/types';

  export let x: u32;
  export let y: u32;
  export let closeContextMenu: () => void;
  export let isConversationEmptyActionEnabled = false;

  let wrapper: ContextMenuWrapper;

  /**
   * Close the context menu
   */
  export function close(): void {
    wrapper.close();
  }

  /**
   * Open the context menu
   */
  export function open(): void {
    wrapper.open();
  }

  const dispatchEvent = createEventDispatcher();

  function closeMenuAndDispatchEvent(eventName: string): () => void {
    return () => {
      closeContextMenu();
      dispatchEvent(eventName);
    };
  }
</script>

<template>
  <div>
    <ContextMenuWrapper
      bind:this={wrapper}
      directionX={'auto'}
      on:clickoutside={closeContextMenu}
      {x}
      {y}
    >
      <MenuContainer mode="small">
        <MenuItem
          disabled={!isConversationEmptyActionEnabled}
          on:click={closeMenuAndDispatchEvent('emptyConversationActionClicked')}
        >
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">delete_sweep</MdIcon>
          </span>
          <span>Empty Chat</span>
        </MenuItem>
      </MenuContainer>
    </ContextMenuWrapper>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-width: #{rem(180px)};
  }
</style>
