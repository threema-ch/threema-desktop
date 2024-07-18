<script lang="ts">
  import type {SvelteComponent} from 'svelte';

  import type {AppServices} from '~/app/types';
  import AppUpdate from '~/app/ui/system-dialogs/AppUpdate.svelte';
  import ConnectionError from '~/app/ui/system-dialogs/ConnectionError.svelte';
  import DeviceCookieMismatch from '~/app/ui/system-dialogs/DeviceCookieMismatch.svelte';
  import InvalidWorkCredentials from '~/app/ui/system-dialogs/InvalidWorkCredentials.svelte';
  import MissingDeviceCookie from '~/app/ui/system-dialogs/MissingDeviceCookie.svelte';
  import ServerAlert from '~/app/ui/system-dialogs/ServerAlert.svelte';
  import UnrecoverableState from '~/app/ui/system-dialogs/UnrecoverableState.svelte';
  import {display, layout} from '~/common/dom/ui/state';
  import {systemDialogStore} from '~/common/dom/ui/system-dialog';
  import type {Logger} from '~/common/logging';
  import type {DialogAction, SystemDialog} from '~/common/system-dialog';
  import type {Delayed} from '~/common/utils/delayed';

  export let log: Logger;

  export let appServices: Delayed<AppServices>;

  /**
   * Mapping from dialog type to corresponding svelte component.
   */
  const dialogComponents: {
    readonly [Property in SystemDialog['type']]: typeof SvelteComponent<{
      appServices: Delayed<AppServices>;
      context: unknown;
      log: Logger;
      visible: boolean;
    }>;
  } = {
    'app-update': AppUpdate,
    'connection-error': ConnectionError,
    'server-alert': ServerAlert,
    'unrecoverable-state': UnrecoverableState,
    'invalid-work-credentials': InvalidWorkCredentials,
    'missing-device-cookie': MissingDeviceCookie,
    'device-cookie-mismatch': DeviceCookieMismatch,
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
