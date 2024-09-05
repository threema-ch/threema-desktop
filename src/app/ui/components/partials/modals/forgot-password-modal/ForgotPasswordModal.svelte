<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unreachable} from '~/common/utils/assert';

  let step: 1 | 2 = 1;

  function handleClickRelink(): void {
    window.app.deleteProfileAndRestartApp({createBackup: false});
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    title: $i18n.t('dialog--forgot-password.label--title', 'Forgot Password'),
    maxWidth: 460,
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    buttons:
      step === 1
        ? [
            {
              isFocused: true,
              label: $i18n.t('dialog--forgot-password.action--cancel', 'Cancel'),
              onClick: 'close',
              type: 'naked',
            },
            {
              isFocused: false,
              label: $i18n.t('dialog--forgot-password.action--next', 'Next'),
              onClick: () => {
                step = 2;
              },
              type: 'filled',
            },
          ]
        : [
            {
              label: $i18n.t('dialog--forgot-password.action--back', 'Back'),
              onClick: () => {
                step = 1;
              },
              type: 'naked',
            },
            {
              isFocused: false,
              label: $i18n.t('dialog--forgot-password.action--relink', 'Relink Device'),
              onClick: handleClickRelink,
              type: 'filled',
            },
          ],
  }}
  options={{
    allowClosingWithEsc: true,
  }}
  on:close
>
  <div class="content">
    {#if step === 1}
      <p>
        <Text
          text={$i18n.t(
            'dialog--forgot-password.prose--step-1-description-p1',
            'For security reasons, there is no way to recover a lost password for the desktop app. To keep using Threema for desktop, you need to relink it with your mobile device. Click “Next” for the relink instructions.',
          )}
        />
      </p>
    {:else if step === 2}
      <p>
        <Text
          text={$i18n.t(
            'dialog--forgot-password.prose--step-2-description-p1',
            'To relink your device, follow these steps:',
          )}
        />
      </p>
      <ol>
        <li>
          {$i18n.t(
            'dialog--forgot-password.prose--step-2-list-step-1',
            'On your phone, remove this device in “Settings > Threema 2.0 for Desktop (Beta)”',
          )}
        </li>
        <li>
          {$i18n.t(
            'dialog--forgot-password.prose--step-2-list-step-2',
            'Select the “Relink Device” button below to start the linking process',
          )}
        </li>
      </ol>
      <div class="warning">
        <MdIcon theme="Filled">warning</MdIcon>
        <Text
          text={$i18n.t(
            'dialog--forgot-password.prose--step-2-description-p2',
            'Please note: The messages on this device will be lost when relinking (but not on your linked devices).',
          )}
        />
      </div>
    {:else}
      {unreachable(step)}
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

    .warning {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(12px);
    }
  }
</style>
