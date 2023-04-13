<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <div>
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
