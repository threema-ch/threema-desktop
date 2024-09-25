<!--
  @component Renders a system dialog to inform the user about the app update download progress.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import Logo from '~/app/ui/components/partials/logo/Logo.svelte';
  import type {AutoAppUpdateDownloadDialogProps} from '~/app/ui/components/partials/system-dialog/internal/auto-app-update-download-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {TIMER} from '~/common/utils/timer';

  type $$Props = AutoAppUpdateDownloadDialogProps;

  export let latestVersion: $$Props['latestVersion'];
  export let onCompletion: $$Props['onCompletion'];
  export let progress: $$Props['progress'];
  export let target: $$Props['target'] = undefined;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  function handleCompleteAnimation(): void {
    TIMER.timeout(() => {
      onCompletion();
      modalComponent?.close();
    }, 1000);
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
    allowSubmittingWithEnter: false,
    overlay: 'opaque',
    suspendHotkeysWhenVisible: true,
  }}
  on:close
>
  <div class="content">
    <div class="indicator">
      <Logo animated={true} onCompletion={handleCompleteAnimation} {progress} />
    </div>
    <div class="status">
      <p>
        {#if progress < 0.99}
          {$i18n.t(
            'dialog--auto-app-update-download.prose--downloading',
            'Downloading Threema {version} for desktop…',
            {
              version: latestVersion,
            },
          )}
        {:else}
          {$i18n.t('dialog--auto-app-update-download.prose--restarting', 'Preparing installation…')}
        {/if}
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
    justify-content: center;
    gap: rem(10px);

    padding: rem(16px);
    width: rem(380px);
    height: rem(380px);

    .indicator {
      width: rem(96px);
      height: rem(121px);
    }

    .status {
      text-align: center;

      p:first-child {
        margin-top: 0;
      }

      p:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>
