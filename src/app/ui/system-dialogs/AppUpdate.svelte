<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {type AppUpdateDialog} from '~/common/system-dialog';

  export let visible: boolean;

  export let context: AppUpdateDialog['context'];
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
      <Title
        slot="header"
        title={$i18n.t(
          'dialog--app-update.label--title',
          'Update available: {current} → {latest}',
          {
            current: context.currentVersion,
            latest: context.latestVersion,
          },
        )}
      />
      <div class="body" slot="body">
        <p>
          {$i18n.t('dialog--app-update.prose--intro', 'An update for Threema is available!')}
        </p>
        {#if context.systemInfo.os === 'linux'}
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--app-update.markup--linux-p1',
                'Please install the update through your system package manager, or by running <1>flatpak update</1> in your terminal.',
              )}
            >
              <code slot="1" let:text>{text}</code>
            </SubstitutableText>
          </p>
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--app-update.markup--linux-p2',
                'For more information about this update, see <1 />.',
              )}
            >
              <a slot="1" href="https://three.ma/md" target="_blank" rel="noreferrer noopener"
                >three.ma/md</a
              >
            </SubstitutableText>
          </p>
        {:else if context.systemInfo.os === 'macos'}
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--app-update.markup--macos-p1',
                'Please update by downloading and installing the latest release from <1 />.',
              )}
            >
              <a slot="1" href="https://three.ma/md" target="_blank" rel="noreferrer noopener"
                >three.ma/md</a
              >
            </SubstitutableText>
          </p>
        {:else if context.systemInfo.os === 'windows'}
          <p>
            <SubstitutableText
              text={$i18n.t(
                'dialog--app-update.markup--windows-p1',
                'Please update by downloading and installing the latest release from <1 />.',
              )}
            >
              <a slot="1" href="https://three.ma/md" target="_blank" rel="noreferrer noopener"
                >three.ma/md</a
              >
            </SubstitutableText>
          </p>
        {:else}
          <p>
            <SubstitutableText
              text={$i18n.t('dialog--app-update.markup--other-os-p1', 'Please update {name}.', {
                name: import.meta.env.APP_NAME,
              })}
            />
          </p>
        {/if}
      </div>
      <CancelAndConfirm
        slot="footer"
        confirmText={$i18n.t('dialog--app-update.action--confirm', 'OK')}
        focusOnMount="confirm"
        let:modal
        {modal}
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
