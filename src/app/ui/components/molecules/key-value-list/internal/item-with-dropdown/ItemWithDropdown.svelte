<!--
  @component
  Renders an item of a `KeyValueList` that contains a dropdown with options to choose from.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte/internal';

  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type {ItemWithDropdownProps} from '~/app/ui/components/molecules/key-value-list/internal/item-with-dropdown/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint, Offset} from '~/app/ui/generic/popover/types';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = ItemWithDropdownProps;

  export let items: $$Props['items'];
  export let key: $$Props['key'];
  export let options: NonNullable<$$Props['options']> = {};

  const dispatch = createEventDispatcher<{
    clickinfoicon: MouseEvent;
  }>();

  const anchorPoints: AnchorPoint = {
    reference: {
      horizontal: 'right',
      vertical: 'bottom',
    },
    popover: {
      horizontal: 'right',
      vertical: 'top',
    },
  };

  const offset: Offset = {
    left: 0,
    top: 4,
  };

  let referenceElement: SvelteNullableBinding<HTMLElement> = null;
  let popover: SvelteNullableBinding<Popover> = null;

  function handleClickItem(): void {
    popover?.close();
  }

  function handleClickInfoIcon(event: MouseEvent): void {
    dispatch('clickinfoicon', event);
  }
</script>

<ContextMenuProvider
  bind:popover
  {items}
  {anchorPoints}
  {offset}
  reference={referenceElement}
  triggerBehavior="toggle"
  on:clickitem={handleClickItem}
>
  <button class="item" on:click>
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
      <span bind:this={referenceElement} class="icon">
        <MdIcon theme="Outlined">expand_more</MdIcon>
      </span>
    </div>
  </button>
</ContextMenuProvider>

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
      .icon {
        display: flex;
        place-items: center;
        font-size: rem(24px);
        line-height: rem(24px);
        color: var(--t-text-e2-color);
        padding: rem(8px);
      }
    }
  }
</style>
