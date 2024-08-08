<script lang="ts">
  import type {AppServicesForSvelte} from '~/app/types';
  import AppUpdateDialog from '~/app/ui/components/partials/system-dialog/internal/app-update-dialog/AppUpdateDialog.svelte';
  import ConnectionErrorDialog from '~/app/ui/components/partials/system-dialog/internal/connection-error-dialog/ConnectionErrorDialog.svelte';
  import DeviceCookieMismatchDialog from '~/app/ui/components/partials/system-dialog/internal/device-cookie-mismatch-dialog/DeviceCookieMismatchDialog.svelte';
  import InvalidWorkCredentialsDialog from '~/app/ui/components/partials/system-dialog/internal/invalid-work-credentials-dialog/InvalidWorkCredentialsDialog.svelte';
  import MissingDeviceCookieDialog from '~/app/ui/components/partials/system-dialog/internal/missing-device-cookie-dialog/MissingDeviceCookieDialog.svelte';
  import ServerAlertDialog from '~/app/ui/components/partials/system-dialog/internal/server-alert-dialog/ServerAlertDialog.svelte';
  import UnrecoverableStateDialog from '~/app/ui/components/partials/system-dialog/internal/unrecoverable-state-dialog/UnrecoverableStateDialog.svelte';
  import {systemDialogStore} from '~/common/dom/ui/system-dialog';
  import type {Logger} from '~/common/logging';
  import type {DialogAction} from '~/common/system-dialog';
  import {unreachable} from '~/common/utils/assert';
  import type {Delayed} from '~/common/utils/delayed';

  export let log: Logger;
  export let appServices: Delayed<AppServicesForSvelte>;

  function closeDialog(action: DialogAction): void {
    log.debug(`System dialog ${action}`);
    const dialogs = systemDialogStore.get();
    const dialog = dialogs.pop();
    if (dialog !== undefined) {
      dialog.handle.closed.resolve(action);
    }
    systemDialogStore.set([...dialogs]);
  }
</script>

{#each $systemDialogStore as systemDialog}
  {#if systemDialog.dialog.type === 'app-update'}
    <AppUpdateDialog {...systemDialog.dialog.context} on:submit={() => closeDialog('confirmed')} />
  {:else if systemDialog.dialog.type === 'connection-error'}
    <ConnectionErrorDialog
      error={systemDialog.dialog.context}
      on:submit={() => closeDialog('confirmed')}
      on:close={() => closeDialog('cancelled')}
    />
  {:else if systemDialog.dialog.type === 'device-cookie-mismatch'}
    <DeviceCookieMismatchDialog
      services={appServices}
      on:submit={() => closeDialog('confirmed')}
      on:close={() => closeDialog('cancelled')}
    />
  {:else if systemDialog.dialog.type === 'invalid-work-credentials'}
    <InvalidWorkCredentialsDialog
      services={appServices}
      {...systemDialog.dialog.context}
      on:close={() => closeDialog('cancelled')}
    />
  {:else if systemDialog.dialog.type === 'missing-device-cookie'}
    <MissingDeviceCookieDialog
      services={appServices}
      on:submit={() => closeDialog('confirmed')}
      on:close={() => closeDialog('cancelled')}
    />
  {:else if systemDialog.dialog.type === 'server-alert'}
    <ServerAlertDialog
      services={appServices}
      {...systemDialog.dialog.context}
      on:submit={() => closeDialog('confirmed')}
      on:close={() => closeDialog('cancelled')}
    />
  {:else if systemDialog.dialog.type === 'unrecoverable-state'}
    <UnrecoverableStateDialog
      on:submit={() => closeDialog('confirmed')}
      on:close={() => closeDialog('cancelled')}
    />
  {:else}
    {unreachable(systemDialog.dialog)}
  {/if}
{/each}
