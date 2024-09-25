<!--
  @component Renders a system dialog to inform the user about a new app update.
-->
<script lang="ts">
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ManualAppUpdateDialogProps} from '~/app/ui/components/partials/system-dialog/internal/manual-app-update-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = ManualAppUpdateDialogProps;

  export let currentVersion: $$Props['currentVersion'];
  export let latestVersion: $$Props['latestVersion'];
  export let onSelectAction: $$Props['onSelectAction'] = undefined;
  export let systemInfo: $$Props['systemInfo'];
  export let target: $$Props['target'] = undefined;

  let modalComponent: SvelteNullableBinding<Modal> = null;
</script>

<Modal
  bind:this={modalComponent}
  {target}
  wrapper={{
    type: 'card',
    buttons: [
      {
        isFocused: true,
        label: $i18n.t('dialog--manual-app-update.action--dismiss', 'OK'),
        onClick: () => {
          onSelectAction?.('dismissed');
          modalComponent?.close();
        },
        type: 'filled',
      },
    ],
    title: $i18n.t(
      'dialog--manual-app-update.label--title',
      'Update available: {current} → {latest}',
      {
        current: currentVersion,
        latest: latestVersion,
      },
    ),
    minWidth: 340,
    maxWidth: 460,
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
    <p>
      {$i18n.t('dialog--manual-app-update.prose--intro', 'An update for Threema is available!')}
    </p>
    {#if systemInfo.os === 'linux'}
      <p>
        <SubstitutableText
          text={$i18n.t(
            'dialog--manual-app-update.markup--linux-p1',
            'Please install the update through your system package manager or by running <1>flatpak update</1> in your terminal.',
          )}
        >
          <code slot="1" let:text>{text}</code>
        </SubstitutableText>
      </p>
      <p>
        <SubstitutableText
          text={$i18n.t(
            'dialog--manual-app-update.markup--linux-p2',
            'For more information about this update, see <1 />.',
          )}
        >
          <a
            slot="1"
            href={import.meta.env.URLS.downloadAndInfo.full}
            target="_blank"
            rel="noreferrer noopener">{import.meta.env.URLS.downloadAndInfo.short}</a
          >
        </SubstitutableText>
      </p>
    {:else if systemInfo.os === 'macos'}
      <p>
        <SubstitutableText
          text={$i18n.t(
            'dialog--manual-app-update.markup--macos-p1',
            'Please update by downloading and installing the latest release from <1 />.',
          )}
        >
          <a
            slot="1"
            href={import.meta.env.URLS.downloadAndInfo.full}
            target="_blank"
            rel="noreferrer noopener">{import.meta.env.URLS.downloadAndInfo.short}</a
          >
        </SubstitutableText>
      </p>
    {:else}
      <p>
        <SubstitutableText
          text={$i18n.t('dialog--manual-app-update.markup--other-os-p1', 'Please update {name}.', {
            name: import.meta.env.APP_NAME,
          })}
        />
      </p>
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px);

    p:first-child {
      margin-top: 0;
    }

    p:last-child {
      margin-bottom: 0;
    }
  }
</style>
