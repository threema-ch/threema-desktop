<script lang="ts">
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import type {Config} from '~/common/config';
  import type {Logger} from '~/common/logging';
  import type {UnrecoverableStateDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let log: Logger;
  export let config: Config;
  export let visible: boolean;
  export let appServices: Delayed<AppServices>;
  export let context: UnrecoverableStateDialog['context'];
  unusedProp(log, config, appServices, context);

  function deleteProfileAndRestartApp(): void {
    const ipc = window.app;
    ipc.deleteProfileAndRestartApp();
  }

  function handleConfirmEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    deleteProfileAndRestartApp();
  }
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:confirm={handleConfirmEvent}
      on:clickoutside
      on:close
      on:cancel
      closableWithEscape={false}
    >
      <Title
        slot="header"
        title={$i18n.t('dialog--unrecoverable-state.label--title', 'Unrecoverable State Detected')}
      />
      <div class="body" slot="body">
        <p>
          {$i18n.t(
            'dialog--unrecoverable-state.prose--description-p1',
            'We have detected that your local data is in an unrecoverable state. To prevent data loss, you cannot currently send or receive new messages. We apologize for the inconvience.',
          )}
        </p>
        <p>
          {$i18n.t(
            'dialog--unrecoverable-state.prose--description-p2',
            'To continue using Threema, you have to remove your local profile and relink.',
          )}
        </p>
        <p>
          {$i18n.t(
            'dialog--unrecoverable-state.prose--description-p3',
            'Please report this error to Threema Support from Threema on your mobile device (Settings > Beta Feedback). Note: Remember to save your logs before relinking, as they will be cleared.',
          )}
        </p>
      </div>
      <div slot="footer" let:modal>
        <CancelAndConfirm
          cancelText={$i18n.t(
            'dialog--unrecoverable-state.action--cancel',
            'Continue with invalid state',
          )}
          confirmText={$i18n.t('dialog--unrecoverable-state.action--confirm', 'Reset and relink')}
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
  }
</style>
