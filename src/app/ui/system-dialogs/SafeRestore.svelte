<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type SafeRestoreStateDialog} from '~/common/system-dialog';
  import {assert, unreachable} from '~/common/utils/assert';

  export let visible: boolean;

  export let context: SafeRestoreStateDialog['context'];

  function deleteProfileAndRestartApp(): void {
    const ipc = window.app;
    switch (import.meta.env.BUILD_TARGET) {
      case 'electron':
        assert(ipc !== undefined);
        ipc.deleteProfileAndRestartApp();
        break;
      case 'web':
        window.location.reload();
        break;
      default:
        unreachable(import.meta.env.BUILD_TARGET);
    }
  }

  function handleConfirmEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    deleteProfileAndRestartApp();
  }
</script>

<template>
  <ModalWrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:confirm={handleConfirmEvent}
      on:clickoutside
      on:close
      on:cancel
      closableWithEscape={false}
    >
      <Title slot="header" title="Safe Restore Error" />
      <div class="body" slot="body">
        Restoring of the safe backup data failed. Please relink this device to prevent message loss.
        <br />
        <br />
        Reported error: <code>{context.error.message}</code>
        <br />
        <br />
        Please report this error to Threema Support from Threema on your mobile device (Settings > Beta
        Feedback). For more information, see the
        <a href="https://three.ma/faq" target="_blank" rel="noreferrer noopener">FAQ</a>.
      </div>
      <div slot="footer" let:modal>
        <CancelAndConfirm {modal} showCancel={false} confirmText="Relink device" />
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
