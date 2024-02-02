<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';

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
        title={$i18n.t('dialog--delete-message.label--title', 'Delete message from this device?')}
      />
      <CancelAndConfirm
        slot="footer"
        cancelText={$i18n.t('dialog--delete-message.action--cancel', 'Cancel')}
        confirmText={$i18n.t('dialog--delete-message.action--confirm', 'Delete Message')}
        let:modal
        {modal}
      />
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;
</style>
