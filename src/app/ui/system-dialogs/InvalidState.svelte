<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type InvalidStateDialog} from '~/common/system-dialog';
  import {assert, unreachable} from '~/common/utils/assert';

  export let visible: boolean;

  export let context: InvalidStateDialog['context'];

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
      <Title slot="header" title="Invalid Client State Detected" />
      <div class="body" slot="body">
        An invalid client state has been detected. Please relink this device to prevent message
        loss.
        <br />
        <br />
        {#if context.message !== undefined}
          Reported error: <span>{context.message}</span>
          <br />
          <br />
        {/if}
        Please report this error to Threema Support. For more information, see the
        <a href="https://three.ma/faq" target="_blank" rel="noreferrer noopener">FAQ</a>.
      </div>
      <div slot="footer" let:modal>
        {#if context.forceRelink}
          <CancelAndConfirm
            {modal}
            showCancel={false}
            confirmText="Remove local profile and relink"
          />
        {:else}
          <CancelAndConfirm
            {modal}
            cancelText="Continue with invalid state (Debug)"
            confirmText="Relink"
          />
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
