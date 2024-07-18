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
  import type {MissingDeviceCookieDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let log: Logger;
  export let visible: boolean;
  export let appServices: Delayed<AppServices>;
  export let context: MissingDeviceCookieDialog['context'];

  let errorMessage: string | undefined = undefined;
  unusedProp(log, context);

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

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      on:confirm={handleClickConfirm}
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
            'To install the device cookie, you need to relink the desktop app with your mobile device. For security reasons, we recommend installing the device cookie as soon as possible. The message history can be restored after relinking.',
          )}
        />

        {#if errorMessage !== undefined}
          <div class="warning">
            <MdIcon theme="Filled">warning</MdIcon>
            <Text text={errorMessage} />
          </div>
        {/if}
      </div>

      <div slot="footer" let:modal>
        <CancelAndConfirm
          cancelText={$i18n.t('dialog--device-cookie.label--close', 'Continue without relinking')}
          confirmText={$i18n.t('dialog--device-cookie.label--relink', 'Relink device')}
          {modal}
        />
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: 0 rem(16px);
    border-radius: rem(8px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: rem(16px);

    .warning {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
    }
  }
</style>
