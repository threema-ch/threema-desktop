<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import MenuItemDivider from '#3sc/components/generic/Menu/MenuItemDivider.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type ConversationMessageContextMenuEvent} from '~/app/ui/main/conversation/conversation-messages';
  import {MessageDirection, MessageReaction} from '~/common/enum';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';

  interface OpenOptions {
    readonly showAction: {
      readonly copyLink: boolean;
      readonly copyMessage: boolean;
      readonly forward: boolean;
    };
  }

  export let message: Pick<Message<AnyMessageBody>, 'direction' | 'lastReaction'>;

  export let isGroupConversation: boolean;

  export let options: OpenOptions = {
    showAction: {
      copyLink: false,
      copyMessage: true,
      forward: true,
    },
  };

  const dispatchEvent =
    createEventDispatcher<{[TEvent in ConversationMessageContextMenuEvent]: undefined}>();
</script>

<template>
  <div>
    <MenuContainer mode="small">
      {#if options.showAction.copyLink}
        <MenuItem on:click={() => dispatchEvent('copyLink')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">link</MdIcon>
          </span>
          <span>{$i18n.t('messaging.action--message-option-copy-link', 'Copy Link')}</span>
        </MenuItem>
        <MenuItemDivider />
      {/if}
      {#if message.direction === MessageDirection.INBOUND && !isGroupConversation}
        <MenuItem on:click={() => dispatchEvent('thumbup')}>
          <span class="icon thumb-up" slot="icon">
            <MdIcon
              theme={message.lastReaction?.type === MessageReaction.ACKNOWLEDGE
                ? 'Filled'
                : 'Outlined'}>thumb_up</MdIcon
            >
          </span>
          <span>{$i18n.t('messaging.action--message-option-agree', 'Agree')}</span>
        </MenuItem>
        <MenuItem on:click={() => dispatchEvent('thumbdown')}>
          <span class="icon thumb-down" slot="icon">
            <MdIcon
              theme={message.lastReaction?.type === MessageReaction.DECLINE ? 'Filled' : 'Outlined'}
              >thumb_down</MdIcon
            >
          </span>
          <span>{$i18n.t('messaging.action--message-option-disagree', 'Disagree')}</span>
        </MenuItem>
        <MenuItemDivider />
      {/if}
      <MenuItem on:click={() => dispatchEvent('quote')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">format_quote</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--message-option-quote', 'Quote')}</span>
      </MenuItem>
      {#if options.showAction.forward}
        <MenuItem on:click={() => dispatchEvent('forward')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">forward</MdIcon>
          </span>
          <span>{$i18n.t('messaging.action--message-option-forward', 'Forward')}</span>
        </MenuItem>
      {/if}
      {#if options.showAction.copyMessage}
        <MenuItem on:click={() => dispatchEvent('copy')}>
          <span class="icon" slot="icon">
            <MdIcon theme="Outlined">content_copy</MdIcon>
          </span>
          <span>{$i18n.t('messaging.action--message-option-copy', 'Copy Message')}</span>
        </MenuItem>
      {/if}
      <MenuItem on:click={() => dispatchEvent('showMessageDetails')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">info</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--message-option-details', 'Message Details')}</span>
      </MenuItem>
      <MenuItem on:click={() => dispatchEvent('delete')}>
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">delete</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--message-option-delete', 'Delete')}</span>
      </MenuItem>
    </MenuContainer>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-width: #{rem(180px)};
    @extend %elevation-060;

    .thumb-up {
      color: var(--mc-message-status-acknowledged-color);
    }

    .thumb-down {
      color: var(--mc-message-status-declined-color);
    }
  }
</style>
