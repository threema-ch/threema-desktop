<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {i18n} from '~/app/ui/i18n';

  export const foreverPromise: Promise<never> = new Promise<never>(() => {});

  function unlinkAndBackup(): void {
    window.app.deleteProfileAndRestartApp({createBackup: true});
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    title: $i18n.t(
      'dialog--missing-work-credentials.label--title',
      'Missing Threema Work Credentials',
    ),
    maxWidth: 460,
    buttons: [
      {
        isFocused: false,
        label: $i18n.t('dialog--missing-work-credentials.action--relink', 'Relink Device'),
        onClick: unlinkAndBackup,
        type: 'filled',
      },
    ],
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: true,
  }}
>
  <div class="content">
    <p>
      <Text
        text={$i18n.t(
          'dialog--missing-work-credentials.prose--description-p1',
          'No Threema Work credentials could be found. To continue using the desktop app, you need to relink this device. First, unlink it by tapping “Threema > Settings > Desktop/Web > Linked Device” on your mobile device and selecting “Remove all linked devices.”',
        )}
      />
    </p>
    <p>
      <Text
        text={$i18n.t(
          'dialog--missing-work-credentials.prose--description-p2',
          'Once completed, click on “Relink” below, and follow the on-screen instructions. Your message history will be restored after relinking.',
        )}
      />
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
