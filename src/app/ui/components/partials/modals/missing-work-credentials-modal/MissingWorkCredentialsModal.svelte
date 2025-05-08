<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {MissingWorkCredentialsProps} from '~/app/ui/components/partials/modals/missing-work-credentials-modal/props';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = MissingWorkCredentialsProps;

  export let services: $$Props['services'];

  export const foreverPromise: Promise<never> = new Promise<never>(() => {});

  function unlinkAndBackup(): void {
    services.electron.deleteProfileAndRestartApp({createBackup: true});
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    title: $i18n.t(
      'dialog--missing-work-credentials.label--title',
      'Missing {fullAppName} Credentials',
      {
        fullAppName: import.meta.env.APP_NAME,
      },
    ),
    maxWidth: 460,
    buttons: [
      {
        isFocused: false,
        label: $i18n.t('dialog--common.action--relink', 'Relink Device'),
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
          'dialog--missing-work-credentials.prose--description',
          'No {fullAppName} credentials could be found. To continue using the desktop app, you need to relink this device. Your message history will be restored after relinking.',
          {
            fullAppName: import.meta.env.APP_NAME,
          },
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
