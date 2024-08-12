<!--
  @component Renders system dialogs.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import AppUpdateDialog from '~/app/ui/components/partials/system-dialog/internal/app-update-dialog/AppUpdateDialog.svelte';
  import ConnectionErrorDialog from '~/app/ui/components/partials/system-dialog/internal/connection-error-dialog/ConnectionErrorDialog.svelte';
  import DeviceCookieMismatchDialog from '~/app/ui/components/partials/system-dialog/internal/device-cookie-mismatch-dialog/DeviceCookieMismatchDialog.svelte';
  import InvalidWorkCredentialsDialog from '~/app/ui/components/partials/system-dialog/internal/invalid-work-credentials-dialog/InvalidWorkCredentialsDialog.svelte';
  import MissingDeviceCookieDialog from '~/app/ui/components/partials/system-dialog/internal/missing-device-cookie-dialog/MissingDeviceCookieDialog.svelte';
  import ServerAlertDialog from '~/app/ui/components/partials/system-dialog/internal/server-alert-dialog/ServerAlertDialog.svelte';
  import UnrecoverableStateDialog from '~/app/ui/components/partials/system-dialog/internal/unrecoverable-state-dialog/UnrecoverableStateDialog.svelte';
  import type {SystemDialogProps} from '~/app/ui/components/partials/system-dialog/props';
  import {systemDialogStore} from '~/common/dom/ui/system-dialog';
  import type {SystemDialogAction} from '~/common/system-dialog';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.system-dialog');

  type $$Props = SystemDialogProps;

  export let services: $$Props['services'];
  export let target: $$Props['target'] = undefined;

  function handleSelectAction(
    action: SystemDialogAction,
    systemDialog: (typeof $systemDialogStore)[u53],
  ): void {
    log.debug(`Action "${action}" selected in dialog: "${systemDialog.dialog.type}"`);

    systemDialogStore
      .get()
      .find((item) => item === systemDialog)
      ?.handle.closed.resolve(action);
  }

  function handleClose(systemDialog: (typeof $systemDialogStore)[u53]): void {
    log.debug(`Closing dialog: "${systemDialog.dialog.type}"`);

    systemDialogStore.set(systemDialogStore.get().filter((item) => item !== systemDialog));
  }
</script>

{#each $systemDialogStore as systemDialog (systemDialog)}
  {#if systemDialog.dialog.type === 'app-update'}
    <AppUpdateDialog
      {...systemDialog.dialog.context}
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'connection-error'}
    <ConnectionErrorDialog
      {...systemDialog.dialog.context}
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {services}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'device-cookie-mismatch'}
    <DeviceCookieMismatchDialog
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {services}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'invalid-work-credentials'}
    <InvalidWorkCredentialsDialog
      {...systemDialog.dialog.context}
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {services}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'missing-device-cookie'}
    <MissingDeviceCookieDialog
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {services}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'server-alert'}
    <ServerAlertDialog
      {...systemDialog.dialog.context}
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {services}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'unrecoverable-state'}
    <UnrecoverableStateDialog
      onSelectAction={(action) => handleSelectAction(action, systemDialog)}
      {services}
      {target}
      on:close={() => handleClose(systemDialog)}
    />
  {:else}
    {unreachable(systemDialog.dialog)}
  {/if}
{/each}
