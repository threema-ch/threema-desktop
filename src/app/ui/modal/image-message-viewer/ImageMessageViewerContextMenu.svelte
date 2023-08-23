<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type ImageMessageViewerContextMenuEvent} from '~/app/ui/modal/image-message-viewer';

  const dispatchEvent =
    createEventDispatcher<{[TEvent in ImageMessageViewerContextMenuEvent]: undefined}>();
</script>

<template>
  <div>
    <MenuContainer mode="small">
      <MenuItem on:click={() => dispatchEvent('clicksaveimage')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">download</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--message-option-save-as-file', 'Save as File')}</span>
      </MenuItem>
      <MenuItem on:click={() => dispatchEvent('clickcopyimage')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">photo_library</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--message-option-copy-image', 'Copy Image')}</span>
      </MenuItem>
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
