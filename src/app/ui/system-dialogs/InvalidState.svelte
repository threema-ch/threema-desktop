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
        We have detected that your local data is not consistent with your mobile device. To prevent
        data loss, you cannot currently send or receive new messages. We apologize for the
        inconvience.
        <br />
        <br />
        To continue using Threema, you have to remove your local profile and relink.
        <br />
        <br />
        {#if context.message !== undefined}
          Reported error: <span>{context.message}</span>
          <br />
          <br />
        {/if}
        Please report this error to Threema Support from Threema on your mobile device (Settings > Beta
        Feedback).
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
