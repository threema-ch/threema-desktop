<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {fade} from 'svelte/transition';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  // Import ContextMenuWrapper from '~/app/ui/generic/context-menu/ContextMenuWrapper.svelte';
  // import {type u32} from '~/common/types';

  // Export let x: u32;
  // export let y: u32;
  // export let contextGroup: HTMLElement | undefined = undefined;

  // let wrapper: ContextMenuWrapper;

  /**
   * Close the context menu
   */
  // export function close(): void {
  //   wrapper.close();
  // }

  /**
   * Open the context menu
   */
  // export function open(mouseEvent?: MouseEvent): void {
  //   wrapper.open(mouseEvent);
  // }

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <!-- <ContextMenuWrapper bind:this={wrapper} {contextGroup} on:clickoutside {x} {y}>
    <MenuContainer mode="small">
      <MenuItem on:click={() => dispatchEvent('edit')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">edit</MdIcon>
        </span>
        <span>Edit</span>
      </MenuItem>
      <MenuItem on:click={() => dispatchEvent('delete')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">delete</MdIcon>
        </span>
        <span>Delete</span>
      </MenuItem>
    </MenuContainer>
  </ContextMenuWrapper> -->

  <div transition:fade={{duration: 100}}>
    <MenuContainer mode="small">
      <MenuItem on:click={() => dispatchEvent('edit')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">edit</MdIcon>
        </span>
        <span>Edit</span>
      </MenuItem>
      <MenuItem on:click={() => dispatchEvent('delete')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">delete</MdIcon>
        </span>
        <span>Delete</span>
      </MenuItem>
    </MenuContainer>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-width: auto;
    @extend %elevation-060;
  }
</style>
