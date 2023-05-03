<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import {i18n} from '~/app/ui/i18n';

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <div>
    <MenuContainer mode="small">
      <MenuItem on:click={() => dispatchEvent('edit')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">edit</MdIcon>
        </span>
        <span>{$i18n.t('contacts.action--edit')}</span>
      </MenuItem>
      {#if import.meta.env.BUILD_VARIANT !== 'work'}
        <MenuItem on:click={() => dispatchEvent('delete')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">delete</MdIcon>
          </span>
          <span>{$i18n.t('contacts.action--delete', 'Delete')}</span>
        </MenuItem>
      {/if}
    </MenuContainer>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-width: auto;
  }
</style>
