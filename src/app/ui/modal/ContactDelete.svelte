<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';

  export let displayName: string;

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
        title={$i18n.t('dialog--delete-contact.label--title', 'Delete "{name}"', {
          name: displayName,
        })}
      />
      <div class="body" slot="body">
        {$i18n.t(
          'dialog--delete-contact.prose--prompt',
          'Do you really want to delete this contact and the associated chat history?',
        )}
      </div>
      <CancelAndConfirm
        slot="footer"
        let:modal
        {modal}
        cancelText={$i18n.t('dialog--delete-contact.action--cancel', 'Cancel')}
        confirmText={$i18n.t(
          'dialog--delete-contact.action--confirm',
          'Delete Contact + Chat History',
        )}
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
