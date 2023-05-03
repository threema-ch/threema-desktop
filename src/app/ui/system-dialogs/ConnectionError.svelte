<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type ConnectionErrorDialog} from '~/common/system-dialog';
  import {unreachable} from '~/common/utils/assert';

  export let visible: boolean;

  export let context: ConnectionErrorDialog['context'];

  function deleteProfileAndRestartApp(): void {
    const ipc = window.app;
    ipc.deleteProfileAndRestartApp();
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
      <Title
        slot="header"
        title={$i18n.t('dialog--error-connection.label--title', 'Connection Failed')}
      />
      <div class="body" slot="body">
        <!-- TODO(DESK-1012): Verify if this works and looks good -->
        {#if context.type === 'mediator-update-required'}
          <p>
            {$i18n.t(
              'dialog--error-connection.prose--mediator-update-required-p1',
              'This version of Threema is not compatible with your mediator server. The server uses an outdated protocol version and must be updated first.',
            )}
          </p>
          <p>
            {$i18n.t(
              'dialog--error-connection.prose--mediator-update-required-p2',
              'Please contact your Threema server administrator.',
            )}
          </p>
        {:else if context.type === 'client-update-required'}
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--error-connection.markup--client-update-required-p1',
                'This version of Threema is no longer supported (outdated protocol version).',
              )}
            />
          </p>
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--error-connection.markup--client-update-required-p2',
                'To continue using Threema, please <1>update to the latest version</1>.',
              )}
            >
              <a
                slot="1"
                href="https://three.ma/md"
                target="_blank"
                rel="noreferrer noopener"
                let:text>{text}</a
              >
            </SubstitutableText>
          </p>
        {:else if context.type === 'client-was-dropped'}
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--error-connection.markup--client-was-dropped-p1',
                'This device has been unlinked. This means that you cannot currently send or receive new messages.',
              )}
            />
          </p>
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--error-connection.markup--client-was-dropped-p2',
                'If this was not triggered by you, please note that this might happen for technical reasons during the Tech Preview phase. We apologize for the inconvience.',
              )}
            />
          </p>
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--error-connection.markup--client-was-dropped-p3',
                'For more information, see the <1>FAQ</1>.',
              )}
            >
              <a
                slot="1"
                href="https://threema.ch/faq/md_limit"
                target="_blank"
                rel="noreferrer noopener"
                let:text>{text}</a
              >
            </SubstitutableText>
          </p>
        {:else}
          {unreachable(context)}
        {/if}
      </div>
      <div slot="footer" let:modal>
        {#if context.type === 'client-was-dropped'}
          <CancelAndConfirm
            {modal}
            cancelText={$i18n.t('dialog--error-connection.action--client-was-dropped-cancel', 'OK')}
            confirmText={$i18n.t(
              'dialog--error-connection.action--client-was-dropped-confirm',
              'Remove local profile and relink',
            )}
          />
        {:else}
          <!-- Default buttons -->
          {#if context.userCanReconnect}
            <CancelAndConfirm
              {modal}
              cancelText={$i18n.t('dialog--error-connection.action--default-cancel', 'OK')}
              confirmText={$i18n.t('dialog--error-connection.action--default-confirm', 'Reconnect')}
            />
          {:else}
            <CancelAndConfirm
              {modal}
              showCancel={false}
              confirmText={$i18n.t('dialog--error-connection.action--default-cancel')}
            />
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

  div > p:first-child {
    margin-top: 0;
  }
</style>
