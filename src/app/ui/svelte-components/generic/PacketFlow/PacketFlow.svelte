<script lang="ts">
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {u53} from '~/common/types';

  import type {Packet, PacketFilter} from '.';

  /**
   * Packet layers packets may pass through.
   */
  export let layers: readonly string[] = [];
  /**
   * The packets to be displayed.
   */
  export let packets: readonly Packet[] = [];
  /**
   * Filter function for packets. Defaults to display all packets.
   */
  export let filter: PacketFilter = unfiltered;
  /**
   * Start timestamp for displaying relative packet timestamps to.
   * Defaults to the timestamp of the first packet.
   */
  export let startMs: u53 | undefined = undefined;
  /**
   * The currently selected packet.
   */
  export let selected: Packet | undefined = undefined;

  // Default filter doesn't filter anything
  function unfiltered(): boolean {
    return true;
  }

  // Determine the start tiemstamp, fall back to the first packet
  $: startMs ??= packets[0]?.timestamp;
  // Run packets through the filter function
  $: filtered = packets.filter(
    (packet, index, array) => layers.includes(packet.layer) && filter(packet, index, array),
  );
</script>

<template>
  <article style="--c-t-layers: {layers.length}">
    <header>
      <span title="Direction (inbound or outbound)">IO</span>
      <span title="Time (in seconds)">Time</span>
      {#each layers as layer}<span title={layer}>{layer}</span>{/each}
    </header>
    {#each filtered as packet}
      <section
        on:click={() => (selected = packet)}
        class:active={packet === selected}
        class:error={packet.error}
      >
        <span title={packet.direction}
          ><MdIcon theme="Filled">
            {packet.direction === 'inbound' ? 'chevron_right' : 'chevron_left'}
          </MdIcon></span
        >
        <span>{((packet.timestamp - (startMs ?? 0)) / 1000).toFixed(2)}</span>
        {#each layers as layer}
          {#if layer === packet.layer}<span>{packet.name}</span>{:else}<span />{/if}
        {/each}
      </section>
    {/each}
  </article>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--c-t-layers);

  article {
    display: grid;
    grid-template-areas: 'direction time';
    grid-template-columns:
      auto
      minmax(em(40px), auto)
      repeat(var($-temp-vars, --c-t-layers), 1fr);
    gap: var(--c-packet-flow-gap, default);
    text-align: left;

    > * {
      min-height: 0;
    }

    header,
    section {
      display: contents;

      > * {
        padding: 0 em(4px);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        box-shadow: 0 0 0 var(--c-packet-flow-gap, default)
          var(--c-packet-flow-border-color, default);
        cursor: default;
      }

      :nth-child(1) {
        text-align: center;
        display: grid;
        place-items: center;
      }

      :nth-child(2) {
        text-align: right;
      }
    }

    header {
      font-weight: bold;
    }

    section {
      &:hover > * {
        background-color: var(--c-packet-flow-background-color--hover, default);
      }

      &.active > * {
        background-color: var(--c-packet-flow-background-color--active, default);
      }

      &.error > * {
        background-color: var(--c-packet-flow-background-color--error, default);
      }
    }
  }
</style>
