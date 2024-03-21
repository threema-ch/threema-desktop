<script lang="ts">
  import type {AppServices} from '~/app/types';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {resetProfile} from '~/app/ui/utils/profile';
  import type {Logger} from '~/common/logging';
  import type {MissingDeviceCookieDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let log: Logger;
  export let visible: boolean;
  export let appServices: Delayed<AppServices>;
  export let context: MissingDeviceCookieDialog['context'];
  unusedProp(log, context);

  async function resetAndUnlink(): Promise<void> {
    if (!appServices.isSet()) {
      log.warn('Cannot unlink the profile because the app services are not yet ready');
      return;
    }
    await resetProfile(appServices.unwrap());
  }
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      on:confirm={resetAndUnlink}
      on:close
      on:cancel
      closableWithEscape={false}
      bind:visible
    >
      <Title
        slot="header"
        title={$i18n.t(
          'dialog--device-cookie.label--device-cookie-title',
          'Device-Cookie Synchronisation Recommended',
        )}
      />
      <div class="body" slot="body">
        <Text
          text={$i18n.t(
            'dialog--device-cookie.prose--explanation',
            'Threema Desktop now supports device cookies. This is a mechanism to detect when somebody else is using your identity.',
          )}
        />
        <Text
          text={$i18n.t(
            'dialog--device-cookie.prose--solution',
            'To install the device cookie, you must relink Threema Desktop. Since this is a security feature, we recommend to install the device cookie as soon as possible.',
          )}
        />
      </div>

      <div slot="footer" let:modal>
        <CancelAndConfirm
          cancelText={$i18n.t(
            'dialog--device-cookie.label--close',
            'Continue without device cookie',
          )}
          confirmText={$i18n.t(
            'dialog--device-cookie.label--relink',
            'Relink and synchronize device cookie',
          )}
          {modal}
        />
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    padding: rem(16px);
    border-radius: rem(8px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: rem(16px);
  }

  .action-button {
    display: flex;
    gap: rem(16px);
    align-items: center;

    .loading {
      height: 1.8em;
      width: 1.8em;
    }
  }
</style>
