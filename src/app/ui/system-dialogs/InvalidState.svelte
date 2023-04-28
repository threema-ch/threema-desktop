<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type InvalidStateDialog} from '~/common/system-dialog';

  export let visible: boolean;

  export let context: InvalidStateDialog['context'];

  function deleteProfileAndRestartApp(): void {
    const ipc = window.app;
    ipc.deleteProfileAndRestartApp();
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
      <Title
        slot="header"
        title={$i18n.t('dialog--invalid-state.label--title', 'Invalid Client State Detected')}
      />
      <div class="body" slot="body">
        <!-- TODO(DESK-1012): Verify if this works and looks good -->
        <p>
          {$i18n.t(
            'dialog--invalid-state.prose--description-p1',
            'We have detected that your local data is not consistent with your mobile device. To prevent data loss, you cannot currently send or receive new messages. We apologize for the inconvience.',
          )}
        </p>
        <p>
          {$i18n.t(
            'dialog--invalid-state.prose--description-p2',
            'To continue using Threema, you have to remove your local profile and relink.',
          )}
        </p>
        {#if context.message !== undefined}
          <p>
            {$i18n.t('dialog--invalid-state.prose--description-p3', 'Reported error: {error}', {
              error: context.message,
            })}
          </p>
        {/if}
        <p>
          {$i18n.t(
            'dialog--invalid-state.prose--description-p4',
            'Please report this error to Threema Support from Threema on your mobile device (Settings > Beta Feedback).',
          )}
        </p>
      </div>
      <div slot="footer" let:modal>
        {#if context.forceRelink}
          <CancelAndConfirm
            {modal}
            showCancel={false}
            confirmText={$i18n.t(
              'dialog--invalid-state.action--force-relink-confirm',
              'Remove local profile and relink',
            )}
          />
        {:else}
          <CancelAndConfirm
            {modal}
            cancelText={$i18n.t(
              'dialog--invalid-state.action--default-cancel',
              'Continue with invalid state (Debug)',
            )}
            confirmText={$i18n.t('dialog--invalid-state.action--default-confirm', 'Relink')}
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
