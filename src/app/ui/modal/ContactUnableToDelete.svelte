<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';

  export let displayName: string;

  export let visible: boolean;
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <Title
        slot="header"
        title={$i18n.t('dialog--error-delete-contact.label--title', 'Unable to Delete Contact')}
      />
      <div class="body" slot="body">
        {$i18n.t(
          'dialog--error-delete-contact.error--is-group-member',
          '"{name}" is still member of a group. Remove contact from group, or delete group.',
          {name: displayName},
        )}
      </div>
      <CancelAndConfirm
        slot="footer"
        let:modal
        {modal}
        confirmText={$i18n.t('dialog--error-delete-contact.action--confirm', 'OK')}
      />
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;
    padding: rem(16px);
    max-width: rem(450px);
  }
</style>
