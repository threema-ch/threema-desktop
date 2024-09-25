<!--
  @component Renders a system dialog to inform the user that an error occurred while downloading an
  app update.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import Logo from '~/app/ui/components/partials/logo/Logo.svelte';
  import type {AutoAppUpdateFailedDialogProps} from '~/app/ui/components/partials/system-dialog/internal/auto-app-update-failed-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = AutoAppUpdateFailedDialogProps;

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
          {$i18n.t('dialog--auto-app-update-failed.prose--info', 'Download failed!')}
        </p>
      </div>
    </div>

    <div class="footer">
      <Button flavor="naked" on:click={handleClickDismiss}>
        {$i18n.t('dialog--auto-app-update-failed.action--dismiss', 'Retry later')}
      </Button>

      <Button autofocus={true} flavor="filled" on:click={handleClickConfirm}>
        {$i18n.t('dialog--auto-app-update-failed.action--confirm', 'Retry now')}
      </Button>
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: rem(16px);

    padding: rem(16px);
    min-width: rem(380px);
    height: rem(380px);

    .main {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: rem(10px);

      padding: rem(72px) rem(16px) 0;

      transition: padding 0.25s ease-out;

      .logo {
        width: rem(96px);
        height: rem(121px);
      }

      .text {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        text-align: center;
        // Fix height to a minimum of two text rows to prevent layout shift.
        min-height: rem(40px);

        p:first-child {
          margin-top: 0;
        }

        p:last-child {
          margin-bottom: 0;
        }
      }
    }

    .footer {
      flex: 0 0 auto;

      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: rem(8px);

      height: rem(40px + 32px);
      padding: rem(16px);

      transform: opacity 0.25s ease-out;
    }
  }
</style>
