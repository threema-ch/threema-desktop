<script lang="ts">
  import {createEventDispatcher} from 'svelte/internal';

  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import ContextMenu from '~/app/ui/components/hocs/context-menu/ContextMenu.svelte';
  import type {ItemWithDropdownProps} from '~/app/ui/components/molecules/key-value-list/internal/item-with-dropdown/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = ItemWithDropdownProps;

  export const dispatch = createEventDispatcher<{
    clickinfoicon: MouseEvent;
    clickbutton: MouseEvent;
  }>();

  export let key: $$Props['key'];
  export let options: NonNullable<$$Props['options']> = {};
  export let icon: NonNullable<$$Props['icon']> = 'expand_more';
  export let items: $$Props['items'];

  export let anchorPoints: NonNullable<$$Props['anchorPoints']> = {
    reference: {
      horizontal: 'right',
      vertical: 'bottom',
    },
    popover: {
      horizontal: 'right',
      vertical: 'top',
    },
  };

  export let offset: NonNullable<$$Props['offset']> = {
    left: 0,
    top: 4,
  };

  let referenceElement: SvelteNullableBinding<HTMLElement> = null;
  let popover: SvelteNullableBinding<Popover>;

  function handleClickInfoIcon(event: MouseEvent): void {
    dispatch('clickinfoicon', event);
  }

  function closePopover(): void {
    popover?.close();
  }
</script>

<ContextMenu
  bind:popover
  on:elementchosen={closePopover}
  {items}
  {anchorPoints}
  {offset}
  handleBeforeOpen={undefined}
  reference={referenceElement}
  boundary={undefined}
  triggerBehavior="toggle"
>
  <button slot="trigger" class="item" on:click>
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
        <MdIcon theme="Outlined">{icon}</MdIcon>
      </span>
    </div>
  </button>
</ContextMenu>

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
