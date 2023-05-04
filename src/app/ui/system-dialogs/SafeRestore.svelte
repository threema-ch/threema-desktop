<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type SafeRestoreStateDialog} from '~/common/system-dialog';

  export let visible: boolean;

  export let context: SafeRestoreStateDialog['context'];

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
        title={$i18n.t('dialog--error-safe-restore.label--title', 'Safe Restore Error')}
      />
      <div class="body" slot="body">
        <p>
          <SubstitutableText
            text={$i18n.t(
              'dialog--error-safe-restore.markup--description-p1',
              'Restoring of the safe backup data failed. Please relink this device to prevent message loss.',
            )}
          />
        </p>
        <p>
          <SubstitutableText
            text={$i18n.t(
              'dialog--error-safe-restore.markup--description-p2',
              'Reported error: <1>{error}</1>',
              {error: context.error.message},
            )}
          >
            <code slot="1" let:text>{text}</code>
          </SubstitutableText>
        </p>
        <p>
          <SubstitutableText
            text={$i18n.t(
              'dialog--error-safe-restore.markup--description-p3',
              'Please report this error to Threema Support from Threema on your mobile device (Settings > Beta Feedback). For more information, see the <1>FAQ</1>.',
            )}
          >
            <a
              slot="1"
              href="https://three.ma/faq"
              target="_blank"
              rel="noreferrer noopener"
              let:text>{text}</a
            >
          </SubstitutableText>
        </p>
      </div>
      <div slot="footer" let:modal>
        <CancelAndConfirm
          confirmText={$i18n.t('dialog--error-safe-restore.action--confirm', 'Relink device')}
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
