<script lang="ts">
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {limited, type LimitedArray} from '~/app/ui/svelte-components/utils/array';
  import type {u53} from '~/common/types';

  import {parse, type ParsedBytes} from '.';

  /**
   * Bytes to be displayed.
   */
  export let bytes: Uint8Array;
  /**
   * Maximum amount of byte rows (each row containing up to 16 bytes) to be
   * displayed at once. The user can expand the rows by a click on the
   * `...` button.
   */
  export let limit = Number.POSITIVE_INFINITY;

  let parsed: readonly ParsedBytes[];
  let limiter: u53 = limit;
  let rows: LimitedArray<ParsedBytes>;

  // Parse the bytes into rows of 16 bytes
  $: parsed = parse(bytes);
  // Limit the amount of rows displayed at once
  $: rows = limited(parsed, limiter);
</script>

<template>
  <article>
    {#each rows.items as [offset, byteRepresentations]}
      <section>
        <span class="offset">{offset}</span>
        <span class="hex">
          {#each byteRepresentations as [hex]}<span class="value">{hex}</span>{/each}
        </span>
        <span class="ascii">
          {#each byteRepresentations as [_, ascii]}{ascii}{/each}
        </span>
      </section>
    {/each}
    {#if rows.limited}
      <section>
        <span
          class="expand"
          title="Show all"
          on:click|once={() => (limiter = Number.POSITIVE_INFINITY)}
        >
          <MdIcon theme="Filled">expand_more</MdIcon>
        </span>
      </section>
    {/if}
  </article>
</template>

<style lang="scss">
  @use 'component' as *;

  article {
    display: grid;
    gap: var(--c-byte-view-gap, default);
    grid-template:
      'value offset expand'
      / min-content min-content min-content;
    font-family: var(--c-byte-view-font-family, default);
    text-align: left;

    > * {
      min-height: 0;
    }

    section {
      display: contents;

      > * {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .value {
        padding: 0 em(2px);
      }

      .offset {
        background-color: var(--c-byte-view-offset-background-color, default);
      }

      .expand {
        text-align: center;
        cursor: pointer;
      }
    }
  }
</style>
