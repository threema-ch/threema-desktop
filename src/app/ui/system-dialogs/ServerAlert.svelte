<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type ServerAlertDialog} from '~/common/system-dialog';

  export let visible: boolean;

  export let context: ServerAlertDialog['context'];
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:clickoutside
      on:close
      on:cancel
      closableWithEscape={false}
    >
      <Title slot="header" title={context.title} />
      <div class="body" slot="body">
        {context.text}
      </div>
      <div slot="footer" let:modal>
        <CancelAndConfirm
          confirmText={$i18n.t('dialog--server-alert.action--confirm', 'OK')}
          {modal}
        />
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px);
    border-radius: rem(8px);
    overflow: hidden;
  }
</style>
