<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '~/app/ui/svelte-components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '~/app/ui/svelte-components/generic/Menu/MenuItem.svelte';

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
      <!-- TODO(IOS-3686): Re-enable contact deletion
      {#if import.meta.env.BUILD_VARIANT !== 'work'}
        <MenuItem on:click={() => dispatchEvent('delete')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">delete</MdIcon>
          </span>
          <span>{$i18n.t('contacts.action--delete', 'Delete')}</span>
        </MenuItem>
      {/if}
      -->
    </MenuContainer>
  </div>
</template>
