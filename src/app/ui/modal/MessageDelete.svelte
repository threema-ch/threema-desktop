<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';

  export let visible: boolean;
</script>

<template>
  <ModalWrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <Title
        slot="header"
        title={$i18n.t(
          'topic.messaging.delete-message-prompt-title',
          'Delete message from this device?',
        )}
      />
      <CancelAndConfirm
        slot="footer"
        let:modal
        {modal}
        confirmText={$i18n.t('topic.messaging.delete-message-action', 'Delete Message')}
      />
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;
</style>
