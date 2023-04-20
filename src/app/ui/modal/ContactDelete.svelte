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
  <ModalWrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <Title
        slot="header"
        title={$i18n.t('topic.people.delete-contact-prompt-title', 'Delete "{name}"', {
          name: displayName,
        })}
      />
      <div class="body" slot="body">
        {$i18n.t(
          'topic.people.delete-contact-prompt',
          'Do you really want to delete this contact and the associated chat history?',
        )}
      </div>
      <CancelAndConfirm
        slot="footer"
        let:modal
        {modal}
        confirmText={$i18n.t(
          'topic.people.delete-contact-confirmation',
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
