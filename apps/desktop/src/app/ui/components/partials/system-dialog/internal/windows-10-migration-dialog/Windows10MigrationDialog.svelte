<!--
  @component Renders a system dialog informing the user that Windows 10 is no longer supported.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {Windows10MigrationDialogProps} from '~/app/ui/components/partials/system-dialog/internal/windows-10-migration-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const {onclose, onselectaction}: Windows10MigrationDialogProps = $props();

  let modalComponent = $state<SvelteNullableBinding<Modal>>(null);

  function handleClickConfirm(): void {
    onselectaction?.({type: 'confirmed'});
    modalComponent?.close();
  }
</script>

<Modal
  bind:this={modalComponent}
  {onclose}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: true,
    overlay: 'opaque',
    suspendHotkeysWhenVisible: true,
  }}
  wrapper={{
    type: 'card',
    layout: 'compact',
    maxWidth: 380,
  }}
>
  <div class="content">
    <div class="main">
      <h1>
        {$i18n.t('dialog--windows-10-migration.label--title', 'Outdated Operating System')}
      </h1>
      <div class="text">
        <p>
          {$i18n.t(
            'dialog--windows-10-migration.prose--description',
            'You are using Windows 10, which is outdated. If possible, please upgrade to Windows 11. If upgrading is not possible, please follow the instructions provided below to ensure that this app can continue to receive updates for the time being:',
          )}
        </p>
        <br />
        <p>
          <a
            href={$i18n.t(
              'dialog--windows-10-migration.prose--faq-link',
              'https://threema.com/en/faq/desktop-installation-windows',
            )}
            target="_blank"
            rel="noreferrer noopener"
            >{$i18n.t(
              'dialog--windows-10-migration.prose--faq-link-text',
              'Using Threema for Desktop on Windows 10',
            )}</a
          >
        </p>
      </div>
      <div class="buttons">
        <Button autofocus={true} flavor="filled" onclick={handleClickConfirm}>
          {$i18n.t('dialog--common.action--confirm', 'Confirm')}
        </Button>
      </div>
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

    .main {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: rem(10px);

      padding: rem(16px) rem(16px) 0;

      transition: padding 0.25s ease-out;

      h1 {
        @extend %font-large-400;
      }

      .text {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        text-align: center;

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
  }
</style>
