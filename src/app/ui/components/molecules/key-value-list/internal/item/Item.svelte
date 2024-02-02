<!--
  @component
  Renders an item of a `KeyValueList`.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import type {ItemProps} from '~/app/ui/components/molecules/key-value-list/internal/item/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = ItemProps;

  export let key: $$Props['key'];
  export let options: NonNullable<$$Props['options']> = {};

  const dispatch = createEventDispatcher<{
    clickinfoicon: MouseEvent;
  }>();

  function handleClickInfoIcon(event: MouseEvent): void {
    dispatch('clickinfoicon', event);
  }
</script>

<div class="item">
  <div class="header">
    <div class="key">{key}</div>

    {#if options.showInfoIcon}
      <button class="info" on:click={handleClickInfoIcon}>
        <MdIcon theme="Outlined">info</MdIcon>
      </button>
    {/if}
  </div>
  <div class="value"><slot /></div>
</div>

<style lang="scss">
  @use 'component' as *;

  .item {
    padding: rem(10px) rem(16px);

    .header {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(4px);

      .key {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }

      .info {
        @extend %neutral-input;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        color: var(--ic-list-element-color);
        cursor: pointer;
      }
    }
  }
</style>
