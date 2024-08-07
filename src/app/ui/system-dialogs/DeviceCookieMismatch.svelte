<script lang="ts">
  import type {AppServices} from '~/app/types';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';
  import type {Logger} from '~/common/logging';
  import type {DeviceCookieMismatchDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let appServices: Delayed<AppServices>;
  export let log: Logger;
  export let visible: boolean;
  export let context: DeviceCookieMismatchDialog['context'];

  let errorMessage: string | undefined = undefined;

  unusedProp(context);

  /**
   * Unlink and delete the device data and restart the application.
   */
  async function handleClickConfirm(event: Event): Promise<void> {
    event.preventDefault();
    if (!appServices.isSet()) {
      log.warn('Cannot unlink the profile because the app services are not yet ready');
      return;
    }
    await unlinkAndCreateBackup(appServices.unwrap()).catch((error) => {
      errorMessage = $i18n.t(
        'system.error--device-cookie-no-connection',
        'Failed to unlink the device. Please check your internet connection and try again',
      );
    });
  }
</script>

<ModalWrapper {visible}>
  <ModalDialog
    bind:visible
    on:confirm={handleClickConfirm}
    on:clickoutside
    on:close
    on:cancel
    closableWithEscape={false}
  >
    <Title
      slot="header"
      title={$i18n.t(
        'dialog--device-cookie.label--device-cookie-mismatch-title',
        'Connection from another device detected',
      )}
    />
    <div class="body" slot="body">
      <p>
        {$i18n.t(
          'dialog--device-cookie-mismatch.prose--explanation',
          'The server has detected a connection from a different device with the same Threema ID. If you haven’t recently used your Threema ID on another device, please contact our support and send us the log file if possible.',
        )}
      </p>
      <p>
        {$i18n.t(
          'dialog--device-cookie-mismatch.prose--solution',
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
    <div slot="footer" let:modal>
      <!-- eslint-disable @typescript-eslint/prefer-optional-chain -->
      <CancelAndConfirm
        cancelText={$i18n.t(
          'dialog--device-cookie-mismatch.label--continue',
          'Continue without relinking',
        )}
        confirmText={$i18n.t('dialog--device-cookie-mismatch.label--relink', 'Relink device')}
        cancelDisabled={!appServices.isSet()}
        {modal}
      />
      <!-- eslint-enable @typescript-eslint/prefer-optional-chain -->
    </div>
  </ModalDialog>
</ModalWrapper>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: 0 rem(16px);
    border-radius: rem(8px);
    overflow: hidden;

    .warning {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
    }
  }
</style>
