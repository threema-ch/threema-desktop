<!--
  @component Renders a system dialog to display a server alert message.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ServerAlertDialogProps} from '~/app/ui/components/partials/system-dialog/internal/server-alert-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.server-alert-dialog');

  type $$Props = ServerAlertDialogProps;

  export let services: $$Props['services'];
  export let text: $$Props['text'];

  let errorMessage: string | undefined;

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    try {
      await services
        .unwrap()
        .backend.connectionManager.selfKickFromMediator()
        .then(() => window.app.deleteProfileAndRestartApp({createBackup: true}));
    } catch (error) {
      log.error(error);
      errorMessage = $i18n.t(
        'dialog--server-alert.error--no-connection',
        'Failed to unlink the device. Please check your Internet connection and try again.',
      );
    }
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    buttons: [
      {
        label: $i18n.t('dialog--server-alert.action--continue', 'Continue'),
        onClick: 'close',
        type: 'naked',
      },
      {
        label: $i18n.t('dialog--server-alert.action--confirm', 'Relink Device'),
        onClick: 'submit',
        type: 'filled',
      },
    ],
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
  on:submit
  on:submit={handleSubmit}
>
  <div class="content">
    {#if text.localeCompare('Another connection for the same identity has been established. New messages will no longer be received on this device.') === 0}
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
    {:else}
      <p>
        <Text {text} />
      </p>
      <p>
        <Text
          text={$i18n.t(
            'dialog--server-alert.error--unknown',
            'We recommend that you relink this device. Your message history can be kept.',
          )}
        />
      </p>
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
