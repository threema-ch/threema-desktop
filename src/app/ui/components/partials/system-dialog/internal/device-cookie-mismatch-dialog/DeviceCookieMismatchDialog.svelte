<!--
  @component Renders a system dialog to inform the user about incompatible device cookies.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {DeviceCookieMismatchDialogProps} from '~/app/ui/components/partials/system-dialog/internal/device-cookie-mismatch-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.device-cookie-mismatch-dialog');

  type $$Props = DeviceCookieMismatchDialogProps;

  export let services: $$Props['services'];

  let errorMessage: string | undefined = undefined;

  /**
   * Unlink and delete the device data and restart the application.
   */
  async function handleClickSubmit(): Promise<void> {
    if (!services.isSet()) {
      log.warn('Cannot unlink the profile because the app services are not yet ready');
      return;
    }
    await unlinkAndCreateBackup(services.unwrap()).catch(() => {
      errorMessage = $i18n.t(
        'dialog--device-cookie-mismatch.error--no-connection',
        'Failed to unlink the device. Please check your internet connection and try again',
      );
    });
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    buttons: [
      {
        label: $i18n.t('dialog--device-cookie-mismatch.action--continue', 'Continue'),
        onClick: 'close',
        type: 'naked',
      },
      {
        label: $i18n.t('dialog--device-cookie-mismatch.action--relink', 'Relink Device'),
        onClick: 'submit',
        type: 'filled',
      },
    ],
    title: $i18n.t(
      'dialog--device-cookie-mismatch.label--title',
      'Connection from another device detected',
    ),
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
  on:submit={handleClickSubmit}
>
  <div class="content">
    <p>
      {$i18n.t(
        'dialog--device-cookie-mismatch.prose--description-p1',
        'The server has detected a connection from a different device with the same Threema ID. If you haven’t recently used your Threema ID on another device, please contact our support and send us the log file if possible.',
      )}
    </p>
    <p>
      {$i18n.t(
        'dialog--device-cookie-mismatch.prose--description-p2',
        'If you have used your Threema ID on another device, we recommend relinking the desktop app with your mobile device. The message history can be restored after relinking.',
      )}
    </p>
    {#if errorMessage !== undefined}
      <div class="warning">
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
  }
</style>
