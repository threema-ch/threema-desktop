<script lang="ts">
  import type {AppServices} from '~/app/types';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {i18n} from '~/app/ui/i18n';

  export let services: AppServices;
  /**
   * Unlink and delete the device data and restart the application.
   */
  async function resetProfile(): Promise<void> {
    // First, unlink from mediator
    await services.backend.selfKickFromMediator();

    // Then, request deletion of profile directory and app restart
    const ipc = window.app;
    ipc.deleteProfileAndRestartApp();
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    title: $i18n.t(
      'dialog--device-cookie.label--device-cookie-title',
      'Device-Cookie Synchronisation Recommended',
    ),
    buttons: [
      {
        label: $i18n.t('dialog--device-cookie.label--close', 'Continue without device cookie'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: $i18n.t(
          'dialog--device-cookie.label--relink',
          'Relink and synchronize device cookie',
        ),
        type: 'filled',
        onClick: resetProfile,
      },
    ],
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: false,
  }}
>
  <!--TODO(DESK-1346) Link the FAQs-->
  <div class="content">
    <Text
      text={$i18n.t(
        'dialog--device-cookie.prose--explanation',
        'Threema Desktop now supports device cookies. This is a mechanism to detect when somebody else is using your identity.',
      )}
    ></Text>
    <br /><br />
    <Text
      text={$i18n.t(
        'dialog--device-cookie.prose--solution',
        'To install the device cookie, you must relink Threema Desktop. Since this is a security feature, we recommend to install the device cookie as soon as possible.',
      )}
    ></Text>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px) rem(16px);
    align-items: center;
    justify-content: start;
    position: relative;
  }
</style>
