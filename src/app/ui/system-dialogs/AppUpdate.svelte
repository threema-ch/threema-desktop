<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type AppUpdateDialog} from '~/common/system-dialog';

  export let visible: boolean;

  export let context: AppUpdateDialog['context'];
</script>

<template>
  <ModalWrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:clickoutside
      on:close
      on:cancel
      closableWithEscape={false}
    >
      <Title
        slot="header"
        title="Update available: {context.currentVersion} → {context.latestVersion}"
      />
      <div class="body" slot="body">
        <p>An update for Threema is available!</p>
        {#if context.systemInfo.os === 'linux'}
          <p>
            Please install the update through your system package manager, or by running
            <code>flatpak update</code> in your terminal.
          </p>
          <p>
            For more information about this update, see
            <a href="https://three.ma/md" target="_blank" rel="noopener noreferrer">three.ma/md</a>.
          </p>
        {:else if ['windows', 'macos'].includes(context.systemInfo.os)}
          <p>
            Please update by downloading and installing the latest release from
            <a href="https://three.ma/md" target="_blank" rel="noopener noreferrer">three.ma/md</a>.
          </p>
        {:else}
          <p>Please update {import.meta.env.APP_NAME}.</p>
        {/if}
      </div>
      <CancelAndConfirm slot="footer" let:modal {modal} showCancel={false} confirmText="OK" />
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

  div > p:first-child {
    margin-top: 0;
  }
</style>
