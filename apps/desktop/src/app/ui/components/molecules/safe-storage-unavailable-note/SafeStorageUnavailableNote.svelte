<!--
  @component Visible note explaining why the password cannot be stored securely, shown below the
  "save password" switch when the user tries to enable it and the reason is known and actionable.
-->
<script lang="ts">
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import type {SafeStorageUnavailableNoteProps} from '~/app/ui/components/molecules/safe-storage-unavailable-note/props';
  import {i18n} from '~/app/ui/i18n';
  import {svelteUnreachable} from '~/app/ui/utils/svelte';

  const {reason}: SafeStorageUnavailableNoteProps = $props();

  const secretPortalUrl = import.meta.env.URLS.secretPortal;

  const text = $derived.by((): string | undefined => {
    switch (reason) {
      case 'linux-secret-portal-missing':
        return $i18n.t(
          'dialog--common.markup--safe-storage-secret-portal-missing',
          'Your password cannot be saved securely. First, make sure a system keyring is installed (e.g. GNOME Keyring or KWallet), unlocked, and set as default. Then, restart {shortAppName}. <slot_1>Learn more</slot_1>',
          {shortAppName: import.meta.env.SHORT_APP_NAME},
        );

      case 'linux-secret-portal-backend-failed':
        return $i18n.t(
          'dialog--common.prose--safe-storage-secret-portal-backend-failed',
          'Your password cannot be saved securely because the system keyring did not provide a key. Make sure your keyring is unlocked and set as default, and restart {shortAppName}.',
          {shortAppName: import.meta.env.SHORT_APP_NAME},
        );

      default:
        svelteUnreachable(reason);
        return undefined;
    }
  });
</script>

<div class="note" role="note">
  {#if text !== undefined}
    <span class="text">
      <SubstitutableText {text}>
        {#snippet slot_1(slotText)}
          {#if secretPortalUrl !== 'hidden'}
            <a href={secretPortalUrl.full} target="_blank" rel="noreferrer noopener">{slotText}</a>
          {/if}
        {/snippet}
      </SubstitutableText>
    </span>
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .note {
    padding: rem(8px);
    border-radius: rem(8px);
    background-color: var(--t-alert-box-info-background-color);
    color: var(--t-alert-box-info-color);

    a {
      color: inherit;
      text-decoration: underline;
    }
  }
</style>
