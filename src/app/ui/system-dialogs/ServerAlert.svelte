<script lang="ts">
  import type {AppServices} from '~/app/types';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {Logger} from '~/common/logging';
  import type {ServerAlertDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let log: Logger;
  export let visible: boolean;
  export let appServices: Delayed<AppServices>;
  export let context: ServerAlertDialog['context'];

  let errorMessage: string | undefined;

  async function connectToMediatorAndUnlink(event: Event): Promise<void> {
    const {connectionManager} = appServices.unwrap().backend;
    event.preventDefault();
    try {
      await connectionManager.disconnectAndDisableAutoConnect();
      await connectionManager
        .startPartialConnectionAndUnlink()
        .then(() => window.app.deleteProfileAndRestartApp({createBackup: true}));
    } catch (error) {
      log.error(error);
      errorMessage = $i18n.t(
        'system.error--server-alert-no-connection',
        'Failed to unlink the device. Please check your internet connection and try again',
      );
    }
  }

  unusedProp(log, appServices);
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm={connectToMediatorAndUnlink}
      on:clickoutside
      on:close
      on:cancel
      closableWithEscape={false}
    >
      <Title slot="header" title={context.title} />
      <div class="body" slot="body">
        <p>
          <Text text={context.text}></Text>
        </p>
        <p>
          <Text
            text={$i18n.t(
              'system.error--server-alert-relink',
              'We recommend that you relink Threema Desktop. Your message history can be kept.',
            )}
          ></Text>
        </p>
        {#if errorMessage !== undefined}
          <div class="warning">
            <MdIcon theme="Filled">warning</MdIcon>
            <Text text={errorMessage} />
          </div>
        {/if}
      </div>
      <div slot="footer" let:modal>
        <CancelAndConfirm
          cancelText={$i18n.t(
            'dialog--server-alert.action--continue',
            'Continue without connection',
          )}
          confirmText={$i18n.t('dialog--server-alert.action--confirm', 'Relink Device')}
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
    padding: rem(16px);
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
