<script lang="ts">
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {AppServices} from '~/app/types';
  import {D2mLeaderState} from '~/common/enum';
  import {ConnectionState, ConnectionStateUtils} from '~/common/network/protocol/state';
  import {u64ToHexLe} from '~/common/utils/number';

  export let services: AppServices;

  // Unpack services
  const {backend} = services;

  // Unpack stores
  const {connectionState, leaderState} = backend;

  let connectionState$: ConnectionState;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  $: connectionState$ = $connectionState as ConnectionState;

  let leaderState$: D2mLeaderState;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  $: leaderState$ = $leaderState as D2mLeaderState;

  const deviceIds = backend.deviceIds;
</script>

<template>
  <section class="backend">
    {#await backend.viewModel.debugPanel() then debugPanel}
      <Button
        flavor="filled"
        on:click={() => {
          void backend.toggleAutoConnect();
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
