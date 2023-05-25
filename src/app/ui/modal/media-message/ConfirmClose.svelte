<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';

  export let visible: boolean;
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <Title
        slot="header"
        title={$i18n.t('dialog--discard-media-message.label--title', 'Discard Message Draft')}
      />
      <div class="body" slot="body">
        {$i18n.t(
          'dialog--discard-media-message.prose--prompt',
          'Discard current media message draft?',
        )}
      </div>
      <CancelAndConfirm
        slot="footer"
        cancelText={$i18n.t('dialog--discard-media-message.action--cancel', 'Cancel')}
        confirmText={$i18n.t('dialog--discard-media-message.action--confirm', 'Discard')}
        focusOnMount="confirm"
        let:modal
        {modal}
      />
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;
    padding: rem(16px);
  }
</style>
