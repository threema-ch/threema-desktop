<!--
  @component
  Renders an item of a `KeyValueList` with a switch.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Switch from '~/app/ui/components/atoms/switch/Switch.svelte';
  import type {ItemWithSwitchProps} from '~/app/ui/components/molecules/key-value-list/internal/item-with-switch/props';

  type $$Props = ItemWithSwitchProps;

  export let checked: NonNullable<$$Props['checked']> = false;
  export let disabled: NonNullable<$$Props['disabled']> = false;
  export let key: $$Props['key'];
  export let options: NonNullable<$$Props['options']> = {};

  const dispatch = createEventDispatcher<{
    clickinfoicon: MouseEvent;
    switchevent: {old: boolean; new: boolean};
  }>();

  function handleClickItem(event: MouseEvent): void {
    event.preventDefault();

    if (disabled) {
      return;
    }

    checked = !checked;
    dispatch('switchevent', {old: !checked, new: checked});
  }

  function handleClickInfoIcon(event: MouseEvent): void {
    dispatch('clickinfoicon', event);
  }
</script>

<button class="item" {disabled} on:click={handleClickItem}>
  <div class="left">
    <div class="header">
      <div class="key">{key}</div>

      {#if options.showInfoIcon}
        <button class="info" on:click={handleClickInfoIcon}>
          <MdIcon theme="Outlined">info</MdIcon>
        </button>
      {/if}
    </div>

    <div class="value">
      <slot />
    </div>
  </div>

  <div class="right">
    <span class="switch">
      <Switch bind:disabled bind:checked />
    </span>
  </div>
</button>

<style lang="scss">
  @use 'component' as *;

  .item {
    @extend %neutral-input;
    cursor: pointer;
    text-align: start;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: rem(16px);
    padding: rem(10px) rem(16px);
    width: 100%;

    &:hover {
      background-color: var(--cc-conversation-preview-background-color--hover);
    }

    &:active {
      background-color: var(--cc-conversation-preview-background-color--active);
    }

    .left {
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

      .value {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .right {
      .switch {
        display: flex;
        align-items: center;
        justify-content: center;
        width: rem(40px);
        height: rem(40px);
      }
    }
  }
</style>
