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
</script>

<div class="note" role="note">
  <span class="text">
    {#if reason === 'secret-portal-missing'}
      <SubstitutableText
        text={$i18n.t(
          'dialog--common.markup--safe-storage-secret-portal-missing',
          'Your password cannot be saved securely, because your desktop does not provide a Secret portal. Install a secret service (e.g. GNOME Keyring or KWallet), enable it as the Secret portal for your desktop, and restart {shortAppName}. <slot_1>Learn more</slot_1>',
          {shortAppName: import.meta.env.SHORT_APP_NAME},
        )}
      >
        {#snippet slot_1(text)}
          {#if secretPortalUrl !== 'hidden'}
            <a href={secretPortalUrl.full} target="_blank" rel="noreferrer noopener">{text}</a>
          {/if}
        {/snippet}
      </SubstitutableText>
    {:else if reason === 'secret-portal-backend-failed'}
      {$i18n.t(
        'dialog--common.prose--safe-storage-secret-portal-backend-failed',
        'Your password cannot be saved securely, because the secret service did not provide a key. Make sure your keyring is unlocked and set as default, and restart {shortAppName}.',
        {shortAppName: import.meta.env.SHORT_APP_NAME},
      )}
    {:else}
      {svelteUnreachable(reason)}
    {/if}
  </span>
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
