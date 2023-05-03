<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import {i18n} from '~/app/ui/i18n';

  export let isConversationEmptyActionEnabled = false;

  const dispatchEvent = createEventDispatcher<{emptyConversationActionClicked: undefined}>();

  function closeMenuAndDispatchEvent(eventName: 'emptyConversationActionClicked'): () => void {
    return () => {
      dispatchEvent(eventName);
    };
  }
</script>

<template>
  <div>
    <MenuContainer mode="small">
      <MenuItem
        disabled={!isConversationEmptyActionEnabled}
        on:click={closeMenuAndDispatchEvent('emptyConversationActionClicked')}
      >
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">delete_sweep</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--empty-conversation', 'Empty Chat')}</span>
      </MenuItem>
    </MenuContainer>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-width: #{rem(180px)};
    @extend %elevation-060;
  }
</style>
