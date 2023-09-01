<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    type MediaViewerContextMenuEvent,
    type MediaViewerMessage,
  } from '~/app/ui/modal/media-message-viewer';

  /**
   * The message to display a context menu for.
   */
  export let message: MediaViewerMessage;

  const dispatch = createEventDispatcher<{[TEvent in MediaViewerContextMenuEvent]: MouseEvent}>();

  function handleClickSave(event: MouseEvent): void {
    dispatch('clicksave', event);
  }

  function handleClickCopy(event: MouseEvent): void {
    dispatch('clickcopy', event);
  }
</script>

<template>
  <div>
    <MenuContainer mode="small">
      <MenuItem on:click={handleClickSave}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">download</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--message-option-save-as-file', 'Save as File')}</span>
      </MenuItem>
      {#if message.type === 'image'}
        <MenuItem on:click={handleClickCopy}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">photo_library</MdIcon>
          </span>
          <span>{$i18n.t('messaging.action--message-option-copy-image', 'Copy Image')}</span>
        </MenuItem>
      {/if}
    </MenuContainer>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-min-width: #{rem(180px)};
    @extend %elevation-060;
  }
</style>
