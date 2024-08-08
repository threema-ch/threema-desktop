<!--
  @component Renders a system dialog to inform the user that the app transitioned into an
  unrecoverable state.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {i18n} from '~/app/ui/i18n';

  function handleSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    window.app.deleteProfileAndRestartApp({createBackup: true});
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    buttons: [
      {
        label: $i18n.t('dialog--unrecoverable-state.action--cancel', 'Continue with invalid state'),
        onClick: 'close',
        type: 'naked',
      },
      {
        label: $i18n.t('dialog--unrecoverable-state.action--confirm', 'Reset and relink'),
        onClick: 'submit',
        type: 'filled',
      },
    ],
    title: $i18n.t('dialog--unrecoverable-state.label--title', 'Unrecoverable State Detected'),
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
    <p>
      {$i18n.t(
        'dialog--unrecoverable-state.prose--description-p1',
        'We have detected that your local data is in an unrecoverable state. To prevent data loss, you cannot currently send or receive new messages. We apologize for the inconvenience.',
      )}
    </p>
    <p>
      {$i18n.t(
        'dialog--unrecoverable-state.prose--description-p2',
        'To continue using Threema, you have to remove your local profile and relink.',
      )}
    </p>
    <p>
      {$i18n.t(
        'dialog--unrecoverable-state.prose--description-p3',
        'Please report this error to Threema Support from Threema on your mobile device (Settings > Beta Feedback). Note: Remember to save your logs before relinking, as they will be cleared.',
      )}
    </p>
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
