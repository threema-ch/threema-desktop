<script lang="ts">
  import {type SvelteComponent} from 'svelte';

  import AppUpdate from '~/app/components/system-dialogs/AppUpdate.svelte';
  import ConnectionError from '~/app/components/system-dialogs/ConnectionError.svelte';
  import ServerAlert from '~/app/components/system-dialogs/ServerAlert.svelte';
  import InvalidState from '~/app/components/system-dialogs/InvalidState.svelte';
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
    /* eslint-enable @typescript-eslint/naming-convention */
  };

  function closeDialog(action: DialogAction): void {
    log.debug(`System dialog ${action}`);
    const dialogs = systemDialogStore.get();
    const dialog = dialogs.shift();
    if (dialog !== undefined) {
      dialog.handle.closed.resolve(action);
    }
    systemDialogStore.set([...dialogs]);
  }
</script>

<template>
  {#if $systemDialogStore.length > 0}
    {@const dialog = $systemDialogStore[0].dialog}
    <div class="wrapper">
      <div class="app" data-display={$display} data-layout={$layout[$display]}>
        <svelte:component
          this={dialogComponents[dialog.type]}
          on:confirm={() => closeDialog('confirmed')}
          on:cancel={() => closeDialog('cancelled')}
          on:close={() => closeDialog('cancelled')}
          on:clickoutside={(ev) => ev.preventDefault()}
          visible={true}
          {config}
          {log}
          context={dialog.context}
        />
      </div>
    </div>
  {/if}
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
