<!--
  @component Renders a system dialog to inform the user that the device cookie is missing.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {MissingDeviceCookieDialogProps} from '~/app/ui/components/partials/system-dialog/internal/missing-device-cookie-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.missing-device-cookie-dialog');

  type $$Props = MissingDeviceCookieDialogProps;

  export let onSelectAction: $$Props['onSelectAction'] = undefined;
  export let services: $$Props['services'];
  export let target: $$Props['target'] = undefined;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let errorMessage: string | undefined = undefined;
</script>

<Modal
  bind:this={modalComponent}
  {target}
  wrapper={{
    type: 'card',
    buttons: [
      {
        label: $i18n.t('dialog--device-cookie-missing.action--close', 'Continue Without Relinking'),
        onClick: () => {
          onSelectAction?.('dismissed');
          modalComponent?.close();
        },
        type: 'naked',
      },
      {
        label: $i18n.t('dialog--device-cookie-missing.action--relink', 'Relink Device'),
        onClick: () => {
          if (!services.isSet()) {
            log.warn('Cannot unlink the profile because the app services are not yet ready');
            return;
          }
          unlinkAndCreateBackup(services.unwrap()).catch((error) => {
            log.error(error);
            errorMessage = $i18n.t(
              'dialog--device-cookie-missing.error--no-connection',
              'Failed to unlink the device. Please check your internet connection and try again',
            );
          });
        },
        type: 'filled',
      },
    ],
    title: $i18n.t('dialog--device-cookie-missing.label--title', 'Relinking Recommended'),
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
    <p>
      <Text
        text={$i18n.t(
          'dialog--device-cookie-missing.prose--description',
          'To improve multi-device security, it is necessary to relink this device. Your message history will be restored after relinking.',
        )}
      />
    </p>

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
