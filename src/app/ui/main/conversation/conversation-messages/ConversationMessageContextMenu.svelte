<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import MenuItemDivider from '#3sc/components/generic/Menu/MenuItemDivider.svelte';
  import {type ContextMenuDirectionX} from '~/app/ui/generic/context-menu';
  import ContextMenuWrapper from '~/app/ui/generic/context-menu/ContextMenuWrapper.svelte';
  import {type ConversationMessageContextMenuEvent} from '~/app/ui/main/conversation/conversation-messages';
  import {type u32} from '~/common/types';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';

  export let x: u32;
  export let y: u32;

  export let message: Pick<Message<AnyMessageBody>, 'direction' | 'lastReaction'>;

  export let isGroupConversation: boolean;

  export let directionX: ContextMenuDirectionX = 'auto';

  let wrapper: ContextMenuWrapper;

  /**
   * Close the context menu
   */
  export function close(): void {
    wrapper.close();
  }

  /**
   * Open the context menu
   */
  export function open(): void {
    wrapper.open();
  }

  const dispatchEvent =
    createEventDispatcher<{[TEvent in ConversationMessageContextMenuEvent]: undefined}>();
</script>

<template>
  <div>
    <ContextMenuWrapper bind:this={wrapper} {directionX} on:clickoutside {x} {y}>
      <MenuContainer mode="small">
        {#if message.direction === 'incoming' && !isGroupConversation}
          <MenuItem on:click={() => dispatchEvent('thumbup')}>
            <span class="icon" slot="icon">
              <MdIcon theme={message.lastReaction?.type === 'acknowledged' ? 'Filled' : 'Outlined'}
                >thumb_up</MdIcon
              >
            </span>
            <span>Agree</span>
          </MenuItem>
          <MenuItem on:click={() => dispatchEvent('thumbdown')}>
            <span class="icon thumb-down" slot="icon">
              <MdIcon theme={message.lastReaction?.type === 'declined' ? 'Filled' : 'Outlined'}
                >thumb_down</MdIcon
              >
            </span>
            <span>Disagree</span>
          </MenuItem>
          <MenuItemDivider />
        {/if}
        <MenuItem disabled={true} on:click={() => dispatchEvent('quote')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">format_quote</MdIcon>
          </span>
          <span>Quote</span>
        </MenuItem>
        <MenuItem on:click={() => dispatchEvent('forward')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">forward</MdIcon>
          </span>
          <span>Forward</span>
        </MenuItem>
        <MenuItem on:click={() => dispatchEvent('copy')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">content_copy</MdIcon>
          </span>
          <span>Copy</span>
        </MenuItem>
        <MenuItem disabled={true} on:click={() => dispatchEvent('share')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">share</MdIcon>
          </span>
          <span>Share</span>
        </MenuItem>
        <MenuItem on:click={() => dispatchEvent('showMessageDetails')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">info</MdIcon>
          </span>
          <span>Message Details</span>
        </MenuItem>
        <MenuItem on:click={() => dispatchEvent('delete')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">delete</MdIcon>
          </span>
          <span>Delete</span>
        </MenuItem>
      </MenuContainer>
    </ContextMenuWrapper>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-width: #{rem(180px)};

    .thumb-down {
      color: $warning-orange;
    }
  }
</style>
