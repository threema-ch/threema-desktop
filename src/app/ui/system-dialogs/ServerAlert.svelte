<script lang="ts">
  import type {Logger} from 'libthreema';
  import type {AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {Config} from '~/common/config';
  import type {ServerAlertDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let log: Logger;
  export let config: Config;
  export let visible: boolean;
  export let appServices: Delayed<AppServices>;
  export let context: ServerAlertDialog['context'];

  unusedProp(log, config, appServices);
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:clickoutside
      on:close
      on:cancel
      closableWithEscape={false}
    >
      <Title slot="header" title={context.title} />
      <div class="body" slot="body">
        {context.text}
      </div>
      <div slot="footer" let:modal>
        <CancelAndConfirm
          confirmText={$i18n.t('dialog--server-alert.action--confirm', 'OK')}
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
