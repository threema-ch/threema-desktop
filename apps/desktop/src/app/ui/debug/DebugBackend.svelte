<script lang="ts">
  import {u64ToHexLe} from '@threema/ts-utils/number/u64-to-hex-le';

  import type {AppServicesForSvelte} from '~/app/types';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {D2mLeaderState} from '~/common/enum';
  import {ConnectionState, ConnectionStateUtils} from '~/common/network/protocol/state';
  import {assertUnreachable} from '~/common/utils/assert';

  interface Props {
    services: AppServicesForSvelte;
  }

  const {services}: Props = $props();

  // Unpack services.
  const {backend} = services;

  const {deviceIds, connectionState, leaderState} = backend;

  const connectionState$ = $derived<ConnectionState>($connectionState as ConnectionState);
  const leaderState$ = $derived<D2mLeaderState>($leaderState as D2mLeaderState);
</script>

<template>
  <section class="backend">
    {#await backend.viewModel.debugPanel() then debugPanel}
      <Button
        flavor="filled"
        onclick={() => {
          backend.connectionManager.toggleAutoConnect().catch(assertUnreachable);
        }}
      >
        <span class="icon-and-text" title="Toggle auto-connection">
          <MdIcon theme="Filled">
            {#if connectionState$ === ConnectionState.DISCONNECTED}cloud_off{:else}cloud{/if}
          </MdIcon>
          {ConnectionStateUtils.NAME_OF[connectionState$]}
        </span>
      </Button>

      <p>
        Threema ID: {backend.user.identity}<br />
        CSP Device ID: {u64ToHexLe(deviceIds.cspDeviceId)}<br />
        D2M Device ID: {u64ToHexLe(deviceIds.d2mDeviceId)}<br />
        Server group: {debugPanel.serverGroup}<br />
        Leader: {#if leaderState$ === D2mLeaderState.LEADER}yes{:else}no{/if}
      </p>

      <Button
        flavor="filled"
        onclick={() => {
          backend.debug.forceBackgroundJobsExecution().catch(assertUnreachable);
        }}
      >
        Trigger all Background Jobs
      </Button>
    {/await}
  </section>
</template>

<style lang="scss">
  @use 'component' as *;

  .backend {
    padding: rem(8px);
    display: grid;
    gap: rem(8px);
    place-items: center;
    grid-auto-flow: row;
  }

  .icon-and-text {
    display: flex;
    gap: rem(4px);
    place-items: center;
  }
</style>
