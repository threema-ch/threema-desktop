<script lang="ts">
  import type {SvelteComponent} from 'svelte';

  import type {AppServicesForSvelte} from '~/app/types';
  import AppUpdateDialog from '~/app/ui/components/partials/system-dialog/internal/app-update-dialog/AppUpdateDialog.svelte';
  import ConnectionErrorDialog from '~/app/ui/components/partials/system-dialog/internal/connection-error-dialog/ConnectionErrorDialog.svelte';
  import DeviceCookieMismatchDialog from '~/app/ui/components/partials/system-dialog/internal/device-cookie-mismatch-dialog/DeviceCookieMismatchDialog.svelte';
  import InvalidWorkCredentialsDialog from '~/app/ui/components/partials/system-dialog/internal/invalid-work-credentials-dialog/InvalidWorkCredentialsDialog.svelte';
  import MissingDeviceCookieDialog from '~/app/ui/components/partials/system-dialog/internal/missing-device-cookie-dialog/MissingDeviceCookieDialog.svelte';
  import ServerAlertDialog from '~/app/ui/components/partials/system-dialog/internal/server-alert-dialog/ServerAlertDialog.svelte';
  import UnrecoverableState from '~/app/ui/system-dialogs/UnrecoverableState.svelte';
  import {display, layout} from '~/common/dom/ui/state';
  import {systemDialogStore} from '~/common/dom/ui/system-dialog';
  import type {Logger} from '~/common/logging';
  import type {DialogAction, SystemDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';

  export let log: Logger;

  export let appServices: Delayed<AppServicesForSvelte>;

  /**
   * Mapping from dialog type to corresponding svelte component.
   */
  const dialogComponents: {
    readonly [Property in Exclude<
      SystemDialog['type'],
      | 'app-update'
      | 'connection-error'
      | 'device-cookie-mismatch'
      | 'invalid-work-credentials'
      | 'missing-device-cookie'
      | 'server-alert'
    >]: typeof SvelteComponent<{
      appServices: Delayed<AppServicesForSvelte>;
      context: unknown;
      log: Logger;
      visible: boolean;
    }>;
  } = {
    'unrecoverable-state': UnrecoverableState,
  };

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

<template>
  {#each $systemDialogStore as systemDialog}
    {#if systemDialog.dialog.type === 'app-update'}
      <AppUpdateDialog
        {...systemDialog.dialog.context}
        on:submit={() => closeDialog('confirmed')}
      />
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
    {:else}
      <div class="wrapper">
        <div class="app" data-display={$display} data-layout={$layout[$display]}>
          <svelte:component
            this={dialogComponents[systemDialog.dialog.type]}
            on:confirm={() => closeDialog('confirmed')}
            on:cancel={() => closeDialog('cancelled')}
            on:close={() => closeDialog('cancelled')}
            on:clickoutside={(ev) => ev.preventDefault()}
            visible={true}
            {log}
            {appServices}
            context={systemDialog.dialog.context}
          />
        </div>
      </div>
    {/if}
  {/each}
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    height: 100vh;
    width: 100vw;
    z-index: 999;
    background-color: var(--t-main-background-color);
    position: fixed;
    top: 0;
    left: 0;
    display: grid;
    place-items: center;
  }

  .app {
    display: grid;
    color: var(--t-text-e1-color);
    overflow: hidden;
  }
</style>
