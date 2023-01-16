<script lang="ts">
  import {type SvelteComponent} from 'svelte';

  import AppUpdate from '~/app/ui/system-dialogs/AppUpdate.svelte';
  import ConnectionError from '~/app/ui/system-dialogs/ConnectionError.svelte';
  import InvalidState from '~/app/ui/system-dialogs/InvalidState.svelte';
  import SafeRestore from '~/app/ui/system-dialogs/SafeRestore.svelte';
  import ServerAlert from '~/app/ui/system-dialogs/ServerAlert.svelte';
  import {type Config} from '~/common/config';
  import {display, layout} from '~/common/dom/ui/state';
  import {systemDialogStore} from '~/common/dom/ui/system-dialog';
  import {type Logger} from '~/common/logging';
  import {type DialogAction, type SystemDialog} from '~/common/system-dialog';

  export let config: Config;

  export let log: Logger;

  /**
   * Mapping from dialog type to corresponding svelte component.
   */
  const dialogComponents: {
    readonly [Property in SystemDialog['type']]: typeof SvelteComponent;
  } = {
    /* eslint-disable @typescript-eslint/naming-convention */
    'app-update': AppUpdate,
    'connection-error': ConnectionError,
    'server-alert': ServerAlert,
    'invalid-state': InvalidState,
    'safe-restore': SafeRestore,
    /* eslint-enable @typescript-eslint/naming-convention */
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
          {config}
          {log}
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
