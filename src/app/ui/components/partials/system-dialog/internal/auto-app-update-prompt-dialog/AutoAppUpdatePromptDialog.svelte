<!--
  @component Renders a system dialog to ask the user whether to install an available app update.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import Logo from '~/app/ui/components/partials/logo/Logo.svelte';
  import type {AutoAppUpdatePromptDialogProps} from '~/app/ui/components/partials/system-dialog/internal/auto-app-update-prompt-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = AutoAppUpdatePromptDialogProps;

  export let onSelectAction: $$Props['onSelectAction'] = undefined;
  export let target: $$Props['target'] = undefined;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  function handleClickDismiss(): void {
    onSelectAction?.('dismissed');
    modalComponent?.close();
  }

  function handleClickConfirm(): void {
    onSelectAction?.('confirmed');
    modalComponent?.close();
  }
</script>

<Modal
  bind:this={modalComponent}
  {target}
  wrapper={{
    type: 'card',
    layout: 'compact',
    maxWidth: 380,
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: true,
    overlay: 'opaque',
    suspendHotkeysWhenVisible: true,
  }}
  on:close
>
  <div class="content">
    <div class="main">
      <div class="logo">
        <Logo animated={false} />
      </div>
      <div class="text">
        <p>
          {$i18n.t(
            'dialog--auto-app-update-prompt.prose--description-p1',
            'An update is available.',
          )}
        </p>
        <p>
          {$i18n.t(
            'dialog--auto-app-update-prompt.prose--description-p2',
            'After the download is complete, the application will restart automatically. This can take a couple of minutes.',
          )}
        </p>
      </div>
      <div class="buttons">
        <Button flavor="naked" on:click={handleClickDismiss}>
          {$i18n.t('dialog--auto-app-update-prompt.action--dismiss', 'Update later')}
        </Button>

        <Button autofocus={true} flavor="filled" on:click={handleClickConfirm}>
          {$i18n.t('dialog--auto-app-update-prompt.action--confirm', 'Update now')}
        </Button>
      </div>
    </div>
    <div class="footer">
      <p class="hint">
        <small>
          {$i18n.t(
            'dialog--auto-app-update-prompt.prose--description-p3',
            'If the automatic update fails, please download and install the update manually:',
          )}
          <a href="https://three.ma/md" target="_blank">three.ma/md</a>
        </small>
      </p>
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;

    padding: rem(16px);
    height: rem(380px);

    .main {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: rem(10px);

      padding: rem(16px) rem(16px) 0;

      transition: padding 0.25s ease-out;

      .logo {
        width: rem(72px);
        height: rem(90px);
      }

      .text {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        text-align: center;

        p:first-child {
          margin: 0;
        }

        p:last-child {
          margin-bottom: 0;
        }
      }

      .buttons {
        flex: 0 0 auto;

        display: flex;
        align-items: stretch;
        justify-content: center;
        gap: rem(8px);

        height: rem(40px + 32px);
        padding: rem(16px) 0;

        transform: opacity 0.25s ease-out;
      }
    }

    .footer {
      padding: 0 rem(16px);
      text-align: center;
      color: var(--t-text-e2-color);

      .hint {
        margin: 0;
      }
    }
  }
</style>
