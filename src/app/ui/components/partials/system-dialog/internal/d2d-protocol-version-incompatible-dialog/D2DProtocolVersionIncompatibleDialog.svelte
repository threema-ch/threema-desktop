<!--
  @component Renders a system dialog to inform the user about incompatible app versions.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {D2DProtocolVersionIncompatibleDialogProps} from '~/app/ui/components/partials/system-dialog/internal/d2d-protocol-version-incompatible-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.device-cookie-mismatch-dialog');

  type $$Props = D2DProtocolVersionIncompatibleDialogProps;

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
        label: $i18n.t('dialog--d2d-protocol-version-incompatible.action--relink', 'Relink Device'),
        onClick: () => {
          if (!services.isSet()) {
            log.warn('Cannot unlink the profile because the app services are not yet ready');
            return;
          }
          unlinkAndCreateBackup(services.unwrap()).catch((error) => {
            log.error(error);
            errorMessage = $i18n.t(
              'dialog--d2d-protocol-version-incompatible.error--no-connection',
              'Failed to unlink the device. Please check your internet connection and try again.',
            );
          });
        },
        type: 'filled',
      },
    ],
    title: $i18n.t(
      'dialog--d2d-protocol-version-incompatible.label--title',
      'Incompatbile App Version on your Mobile Device',
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
>
  <div class="content">
    <p>
      {$i18n.t(
        'dialog--d2d-protocol-version-incompatible.prose--description-p1',
        'The Threema version installed on your mobile device is not compatible with this version of Threema for desktop. To avoid synchronization problems, please update the app on your mobile device and relink it with Threema for desktop.',
      )}
    </p>
    <p>
      {$i18n.t(
        'dialog--d2d-protocol-version-incompatible.prose--description-p2',
        'The message history can be restored after relinking.',
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
