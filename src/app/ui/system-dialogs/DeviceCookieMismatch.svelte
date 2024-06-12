<script lang="ts">
  import type {AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {resetProfile} from '~/app/ui/utils/profile';
  import type {Config} from '~/common/config';
  import type {Logger} from '~/common/logging';
  import type {DeviceCookieMismatchDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let appServices: Delayed<AppServices> | undefined = undefined;
  export let log: Logger;
  export let config: Config;
  export let visible: boolean;
  export let context: DeviceCookieMismatchDialog['context'];
  unusedProp(config, context);

  /**
   * Unlink and delete the device data and restart the application.
   */
  async function resetAndUnlink(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (appServices === undefined || !appServices.isSet()) {
      log.warn('Cannot unlink the profile because the app services are not yet ready');
      return;
    }
    await resetProfile(appServices.unwrap());
  }
</script>

<ModalWrapper {visible}>
  <ModalDialog
    bind:visible
    on:confirm
    on:clickoutside
    on:close
    on:cancel={resetAndUnlink}
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
          "The server has detected a connection from a different device with the same Threema ID. If you haven't used your Threema ID on another device in the meantime, then please contact support and send the log file if possible.",
        )}
      </p>
      <p>
        {$i18n.t(
          'dialog--device-cookie-mismatch.prose--solution',
          'If you have used your Threema ID on another device, we recommend to relink Threema Desktop to synchronize the device cookie.',
        )}
      </p>
    </div>
    <div slot="footer" let:modal>
      <!-- eslint-disable @typescript-eslint/prefer-optional-chain -->
      <CancelAndConfirm
        cancelText={$i18n.t(
          'dialog--device-cookie.label--relink',
          'Relink and synchronize device cookie',
        )}
        confirmText={$i18n.t('dialog--device-cookie.label--continue', 'Continue')}
        cancelDisabled={appServices === undefined || !appServices.isSet()}
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
    padding: rem(16px);
    border-radius: rem(8px);
    overflow: hidden;
  }
</style>
