<!--
  @component Renders system dialogs.
-->
<script lang="ts">
  import type {f64} from '@threema/ts-utils/float/f64';
  import type {u53} from '@threema/ts-utils/integer/u53';

  import {globals} from '~/app/globals';
  import AutoAppUpdateDownloadDialog from '~/app/ui/components/partials/system-dialog/internal/auto-app-update-download-dialog/AutoAppUpdateDownloadDialog.svelte';
  import AutoAppUpdateFailedDialog from '~/app/ui/components/partials/system-dialog/internal/auto-app-update-failed-dialog/AutoAppUpdateFailedDialog.svelte';
  import AutoAppUpdatePromptDialog from '~/app/ui/components/partials/system-dialog/internal/auto-app-update-prompt-dialog/AutoAppUpdatePromptDialog.svelte';
  import ChangePasswordConfirmDialog from '~/app/ui/components/partials/system-dialog/internal/change-password-confirm-dialog/ChangePasswordConfirmDialog.svelte';
  import ConnectionErrorDialog from '~/app/ui/components/partials/system-dialog/internal/connection-error-dialog/ConnectionErrorDialog.svelte';
  import D2DProtocolVersionIncompatibleDialog from '~/app/ui/components/partials/system-dialog/internal/d2d-protocol-version-incompatible-dialog/D2DProtocolVersionIncompatibleDialog.svelte';
  import DeviceCookieMismatchDialog from '~/app/ui/components/partials/system-dialog/internal/device-cookie-mismatch-dialog/DeviceCookieMismatchDialog.svelte';
  import InvalidWorkCredentialsDialog from '~/app/ui/components/partials/system-dialog/internal/invalid-work-credentials-dialog/InvalidWorkCredentialsDialog.svelte';
  import ManualAppUpdateDialog from '~/app/ui/components/partials/system-dialog/internal/manual-app-update-dialog/ManualAppUpdateDialog.svelte';
  import RemoteSecretsActivationDialog from '~/app/ui/components/partials/system-dialog/internal/remote-secrets-activation-dialog/RemoteSecretsActivationDialog.svelte';
  import RemoteSecretsDeactivationDialog from '~/app/ui/components/partials/system-dialog/internal/remote-secrets-deactivation-dialog/RemoteSecretsDeactivationDialog.svelte';
  import RemoteSecretsSystemSuspendDialog from '~/app/ui/components/partials/system-dialog/internal/remote-secrets-system-suspend-dialog/RemoteSecretsSystemSuspendDialog.svelte';
  import ScreenSharingPickerDialog from '~/app/ui/components/partials/system-dialog/internal/screen-sharing-picker-dialog/ScreenSharingPickerDialog.svelte';
  import ServerAlertDialog from '~/app/ui/components/partials/system-dialog/internal/server-alert-dialog/ServerAlertDialog.svelte';
  import UnrecoverableStateDialog from '~/app/ui/components/partials/system-dialog/internal/unrecoverable-state-dialog/UnrecoverableStateDialog.svelte';
  import Windows10MigrationDialog from '~/app/ui/components/partials/system-dialog/internal/windows-10-migration-dialog/Windows10MigrationDialog.svelte';
  import type {SystemDialogProps} from '~/app/ui/components/partials/system-dialog/props';
  import {svelteUnreachable} from '~/app/ui/utils/svelte';
  import {systemDialogStore} from '~/common/dom/ui/system-dialog';
  import type {SystemDialogAction} from '~/common/system-dialog';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.system-dialog');

  const {services}: SystemDialogProps = $props();

  let progress = $state<f64>(0);

  /**
   * Updates the progress bar displayed in the system dialog, if applicable.
   */
  export function setProgress(currentProgress: f64): void {
    progress = currentProgress;
  }

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
  {#if systemDialog.dialog.type === 'auto-app-update-download'}
    <AutoAppUpdateDownloadDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
      oncompletion={() => handleSelectAction({type: 'confirmed'}, systemDialog)}
      {progress}
    />
  {:else if systemDialog.dialog.type === 'auto-app-update-failed'}
    <AutoAppUpdateFailedDialog
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'auto-app-update-prompt'}
    <AutoAppUpdatePromptDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'change-password-confirm-dialog'}
    <ChangePasswordConfirmDialog
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'connection-error'}
    <ConnectionErrorDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'device-cookie-mismatch'}
    <DeviceCookieMismatchDialog
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'invalid-work-credentials'}
    <InvalidWorkCredentialsDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'manual-app-update'}
    <ManualAppUpdateDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'server-alert'}
    <ServerAlertDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'unrecoverable-state'}
    <UnrecoverableStateDialog
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'device-protocols-incompatible'}
    <D2DProtocolVersionIncompatibleDialog onclose={() => handleClose(systemDialog)} {services} />
  {:else if systemDialog.dialog.type === 'screen-sharing-picker'}
    <ScreenSharingPickerDialog
      {...systemDialog.dialog.context}
      onclose={() => handleClose(systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'remote-secrets-activation'}
    <RemoteSecretsActivationDialog
      {...systemDialog.dialog.context}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'remote-secrets-deactivation'}
    <RemoteSecretsDeactivationDialog
      {...systemDialog.dialog.context}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
      {services}
    />
  {:else if systemDialog.dialog.type === 'remote-secrets-system-suspend'}
    <RemoteSecretsSystemSuspendDialog
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
    />
  {:else if systemDialog.dialog.type === 'windows-10-migration'}
    <Windows10MigrationDialog
      onclose={() => handleClose(systemDialog)}
      onselectaction={(action) => handleSelectAction(action, systemDialog)}
    />
  {:else}
    {svelteUnreachable(systemDialog.dialog)}
  {/if}
{/each}
