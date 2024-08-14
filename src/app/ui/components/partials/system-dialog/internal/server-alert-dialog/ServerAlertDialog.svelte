<!--
  @component Renders a system dialog to display a server alert message.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ModalButton} from '~/app/ui/components/hocs/modal/props';
  import type {ServerAlertDialogProps} from '~/app/ui/components/partials/system-dialog/internal/server-alert-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.server-alert-dialog');

  type $$Props = ServerAlertDialogProps;

  export let onSelectAction: $$Props['onSelectAction'] = undefined;
  export let services: $$Props['services'];
  export let target: $$Props['target'] = undefined;
  export let text: $$Props['text'];

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let errorType: 'other-connection-for-same-identity' | 'unknown' = 'unknown';
  let errorMessage: string | undefined;

  function getButtonsForErrorType(type: typeof errorType): ModalButton[] | undefined {
    switch (type) {
      case 'other-connection-for-same-identity':
        return [
          {
            label: $i18n.t('dialog--server-alert.action--dismiss', 'Continue Without Connection'),
            onClick: () => {
              onSelectAction?.('dismissed');
              modalComponent?.close();
            },
            type: 'naked',
          },
          {
            label: $i18n.t('dialog--server-alert.action--confirm', 'Retry'),
            onClick: () => {
              onSelectAction?.('confirmed');
              modalComponent?.close();
            },
            type: 'naked',
          },
          {
            label: $i18n.t('dialog--server-alert.action--relink', 'Relink Device'),
            onClick: () => {
              if (!services.isSet()) {
                log.warn('Cannot unlink the profile because the app services are not yet ready');
                return;
              }
              unlinkAndCreateBackup(services.unwrap()).catch((error) => {
                log.error(error);
                errorMessage = $i18n.t(
                  'dialog--server-alert.error--no-connection',
                  'Failed to unlink the device. Please check your Internet connection and try again.',
                );
              });
            },
            type: 'filled',
          },
        ];

      case 'unknown':
        return [
          {
            label: $i18n.t('dialog--server-alert.action--ignore', 'Ignore'),
            // This is a bit unintuitive but because the error is unknown, we tell the backend with
            // `confirmed` that it should try to reconnect.
            onClick: () => {
              onSelectAction?.('confirmed');
              modalComponent?.close();
            },
            type: 'filled',
          },
        ];

      default:
        return unreachable(type);
    }
  }

  $: {
    switch (text) {
      case 'Another connection for the same identity has been established. New messages will no longer be received on this device.':
        errorType = 'other-connection-for-same-identity';
        break;

      default:
        errorType = 'unknown';
        break;
    }
  }
</script>

<Modal
  bind:this={modalComponent}
  {target}
  wrapper={{
    type: 'card',
    buttons: getButtonsForErrorType(errorType),
    title: $i18n.t('dialog--server-alert.label--title', 'Message from Server'),
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
    {#if errorType === 'other-connection-for-same-identity'}
      <p>
        <Text
          text={$i18n.t(
            'dialog--server-alert.error--another-device-p1',
            'The server has detected a connection from a different device with the same Threema ID.',
          )}
        />
      </p>
      <p>
        <Text
          text={$i18n.t(
            'dialog--server-alert.error--another-device-p2',
            "If you haven't used your Threema ID on another device or with an older app version in the meantime, please contact the support and send a log file if possible.",
          )}
        />
      </p>
      <p>
        <Text
          text={$i18n.t(
            'dialog--server-alert.error--another-device-p3',
            'Otherwise, we recommend that you relink Threema Desktop. Your message history will be kept.',
          )}
        />
      </p>
    {:else if errorType === 'unknown'}
      <p>
        <Text {text} />
      </p>
    {:else}
      {unreachable(errorType)}
    {/if}
    {#if errorMessage !== undefined}
      <div class="error">
        <MdIcon theme="Filled">warning</MdIcon>
        <Text text={errorMessage} />
      </div>
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

    .error {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: start;
      gap: rem(8px);

      margin-top: rem(14px);
    }
  }
</style>
