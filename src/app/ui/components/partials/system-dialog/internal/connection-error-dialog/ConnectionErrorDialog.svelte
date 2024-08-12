<!--
  @component Renders a system dialog to inform the user about a connection error.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ModalButton} from '~/app/ui/components/hocs/modal/props';
  import type {ConnectionErrorDialogProps} from '~/app/ui/components/partials/system-dialog/internal/connection-error-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.connection-error-dialog');

  type $$Props = ConnectionErrorDialogProps;

  export let error: $$Props['error'];
  export let onSelectAction: $$Props['onSelectAction'] = undefined;
  export let services: $$Props['services'];
  export let target: $$Props['target'] = undefined;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  function getButtons(currentError: typeof error): ModalButton[] {
    switch (currentError) {
      case 'client-update-required':
        return [
          {
            isFocused: true,
            label: $i18n.t('dialog--error-connection.action--default-cancel', 'OK'),
            onClick: () => {
              onSelectAction?.('dismissed');
              modalComponent?.close();
            },
            type: 'filled',
          },
        ];

      case 'client-was-dropped':
      case 'device-slot-state-mismatch':
        return [
          {
            label: $i18n.t('dialog--error-connection.action--client-was-dropped-cancel', 'OK'),
            onClick: () => {
              onSelectAction?.('dismissed');
              modalComponent?.close();
            },
            type: 'naked',
          },
          {
            isFocused: true,
            label: $i18n.t(
              'dialog--error-connection.action--client-was-dropped-confirm',
              'Relink Device',
            ),
            onClick: () => {
              if (!services.isSet()) {
                log.warn('Cannot unlink the profile because the app services are not yet ready');
                return;
              }
              unlinkAndCreateBackup(services.unwrap()).catch(log.error);
            },
            type: 'filled',
          },
        ];

      case 'mediator-update-required':
        return [
          {
            label: $i18n.t('dialog--error-connection.action--default-cancel'),
            onClick: () => {
              onSelectAction?.('dismissed');
              modalComponent?.close();
            },
            type: 'naked',
          },
          {
            isFocused: true,
            label: $i18n.t('dialog--error-connection.action--default-confirm', 'Reconnect'),
            onClick: () => {
              onSelectAction?.('confirmed');
              modalComponent?.close();
            },
            type: 'filled',
          },
        ];

      default:
        return unreachable(currentError);
    }
  }
</script>

<Modal
  bind:this={modalComponent}
  {target}
  wrapper={{
    type: 'card',
    buttons: getButtons(error),
    title: $i18n.t('dialog--error-connection.label--title', 'Connection Failed'),
    minWidth: 340,
    maxWidth: 460,
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: false,
    overlay: 'opaque',
    suspendHotkeysWhenVisible: true,
  }}
  on:close
>
  <div class="content">
    {#if error === 'mediator-update-required'}
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
    {:else if error === 'client-update-required'}
      <p>
        {$i18n.t(
          'dialog--error-connection.markup--client-update-required-p1',
          'This version of Threema is no longer supported (outdated protocol version).',
        )}
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
            href={import.meta.env.URLS.downloadAndInfo.full}
            target="_blank"
            rel="noreferrer noopener"
            let:text>{text}</a
          >
        </SubstitutableText>
      </p>
    {:else if error === 'client-was-dropped'}
      <p>
        {$i18n.t(
          'dialog--error-connection.markup--client-was-dropped-p1',
          'This device has been unlinked. This means that you cannot currently send or receive new messages.',
        )}
      </p>
      <p>
        {$i18n.t(
          'dialog--error-connection.markup--client-was-dropped-p2',
          'If this was not triggered by you, please note that this might happen for technical reasons during the Beta phase. We apologize for the inconvience.',
        )}
      </p>

      <p>
        {$i18n.t(
          'dialog--error-connection.markup--backup',
          'The message history will be restored after relinking.',
        )}
      </p>
      <p>
        <SubstitutableText
          text={$i18n.t(
            'dialog--error-connection.markup--see-faq',
            'For more information, see the <1>FAQ</1>.',
          )}
        >
          <a
            slot="1"
            href={import.meta.env.URLS.limitations.full}
            target="_blank"
            rel="noreferrer noopener"
            let:text>{text}</a
          >
        </SubstitutableText>
      </p>
    {:else if error === 'device-slot-state-mismatch'}
      <p>
        {$i18n.t(
          'dialog--error-connection.markup--device-slot-mismatch-p1',
          'Due to an unexpected error, this device must be re-linked with the server.',
        )}
      </p>
      <p>
        <SubstitutableText
          text={$i18n.t(
            'dialog--error-connection.markup--see-faq',
            'For more information, see the <1>FAQ</1>.',
          )}
        >
          <a
            slot="1"
            href={import.meta.env.URLS.limitations.full}
            target="_blank"
            rel="noreferrer noopener"
            let:text>{text}</a
          >
        </SubstitutableText>
      </p>
    {:else}
      {unreachable(error)}
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px);

    p:first-child {
      margin-top: 0;
    }

    p:last-child {
      margin-bottom: 0;
    }
  }
</style>
