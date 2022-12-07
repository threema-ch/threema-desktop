<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type ConnectionErrorDialog} from '~/common/system-dialog';
  import {assert, unreachable} from '~/common/utils/assert';

  export let visible: boolean;

  export let context: ConnectionErrorDialog['context'];

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
    if (context.type === 'client-was-dropped') {
      event.preventDefault();
      event.stopPropagation();
      deleteProfileAndRestartApp();
    }
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
      <Title slot="header" title="Connection Failed" />
      <div class="body" slot="body">
        {#if context.type === 'mediator-update-required'}
          This version of Threema is not compatible with your mediator server. The server uses an
          outdated protocol version and must be updated first.
          <br />
          <br />
          Please contact your Threema server administrator.
        {:else if context.type === 'client-update-required'}
          This version of Threema is no longer supported (outdated protocol version).
          <br />
          <br />
          To continue using Threema, please
          <a href="https://three.ma/md" target="_blank" rel="noreferrer noopener"
            >update to the latest version</a
          >.
        {:else if context.type === 'client-was-dropped'}
          This device has been unlinked. This means that you cannot currently send or receive new
          messages.
          <br />
          <br />
          If this was not triggered by you, please note that this might happen for technical reasons
          during the Tech Preview phase. We apologize for the inconvience.
          <br />
          <br />
          For more information, see the
          <a href="https://threema.ch/faq/md_limit" target="_blank" rel="noreferrer noopener">FAQ</a
          >.
        {:else}
          {unreachable(context)}
        {/if}
      </div>
      <div slot="footer" let:modal>
        {#if context.type === 'client-was-dropped'}
          <CancelAndConfirm {modal} cancelText="OK" confirmText="Remove local profile and relink" />
        {:else}
          <!-- Default buttons -->
          {#if context.userCanReconnect}
            <CancelAndConfirm {modal} cancelText="OK" confirmText="Reconnect" />
          {:else}
            <CancelAndConfirm {modal} showCancel={false} confirmText="OK" />
          {/if}
        {/if}
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
