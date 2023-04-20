<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
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
        title={$i18n.t(
          'topic.system.update-prompt-title',
          'Update available: {current} → {latest}',
          {current: context.currentVersion, latest: context.latestVersion},
        )}
      />
      <div class="body" slot="body">
        <p>{$i18n.t('topic.system.update-prompt', 'An update for Threema is available!')}</p>
        {#if context.systemInfo.os === 'linux'}
          <!-- TODO(DESK-1012): This is suboptimal for multiple reasons (security concerns, css scoping issues [e.g., the link is currently blue instead of grey.], etc.) -->
          {@html $i18n.t(
            'topic.system.update-prompt-hint-linux',
            `<p>
              Please install the update through your system package manager, or by running
              <code>flatpak update</code> in your terminal.
            </p>
            <p>
              For more information about this update, see
              <a href="https://three.ma/md" target="_blank" rel="noopener noreferrer">three.ma/md</a>.
            </p>`,
          )}
        {:else if ['windows', 'macos'].includes(context.systemInfo.os)}
          <!-- TODO(DESK-1012): This is suboptimal for multiple reasons (security concerns, css scoping issues [e.g., the link is currently blue instead of grey.], etc.) -->
          {@html $i18n.t(
            'topic.system.update-prompt-hint-windows-macos',
            `<p>
              Please update by downloading and installing the latest release from
              <a href="https://three.ma/md" target="_blank" rel="noopener noreferrer">three.ma/md</a>.
            </p>`,
          )}
        {:else}
          <!-- TODO(DESK-1012): This is suboptimal for multiple reasons (security concerns, css scoping issues [e.g., the link is currently blue instead of grey.], etc.) -->
          {@html $i18n.t(
            'topic.system.update-prompt-hint-other-os',
            `<p>Please update {name}.</p>`,
            {name: import.meta.env.APP_NAME},
          )}
        {/if}
      </div>
      <CancelAndConfirm
        slot="footer"
        let:modal
        {modal}
        showCancel={false}
        confirmText={$i18n.t('common.ok')}
      />
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
