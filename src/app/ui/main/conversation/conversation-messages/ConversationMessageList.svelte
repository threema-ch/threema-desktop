<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type AppServices} from '~/app/types';
  import {
    type SortedMessageList,
    type SortedMessageListStore,
    type UnreadMessageInfo,
    getUnreadMessageInfo,
    hasDirectionChanged,
    sortMessages,
  } from '~/app/ui/generic/form';
  import {type ConversationData} from '~/app/ui/main/conversation';
  import ConversationMessageComponent from '~/app/ui/main/conversation/conversation-messages/ConversationMessage.svelte';
  import SystemMessage from '~/app/ui/main/conversation/conversation-messages/SystemMessage.svelte';
  import {type DbReceiverLookup} from '~/common/db';
  import {type Conversation} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type u53} from '~/common/types';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-messages';

  /**
   * App services.
   */
  export let services: AppServices;

  /**
   * Conversation Messages
   */
  export let conversationMessagesSet: RemoteObject<ConversationMessageSetStore>;

  /**
   * Receiver data.
   */
  export let receiver: ConversationData['receiver'];

  /**
   * Current receiver lookup
   */
  export let receiverLookup: DbReceiverLookup;

  /**
   * The parent conversation, to which this message belongs.
   */
  export let conversation: RemoteModelStore<Conversation>;

  /**
   * The intersection observer to detect ui read of messages.
   */
  export let readObserver: IntersectionObserver;

  let sortedMessages: SortedMessageListStore;
  let unreadMessageInfo: UnreadMessageInfo;

  function setUnreadMessageInfo(messageList: SortedMessageList): void {
    unreadMessageInfo = getUnreadMessageInfo($conversation, messageList, unreadMessageInfo);
  }

  $: {
    sortedMessages = sortMessages(conversationMessagesSet);
    setUnreadMessageInfo($sortedMessages);
  }

  function unreadMessageSeparatorLabel(unreadMessageCount: u53): string {
    if (unreadMessageCount < 1) {
      return '';
    }

    if (unreadMessageCount === 1) {
      return '1 New Message';
    }

    return `${unreadMessageCount} New Messages`;
  }
</script>

<template>
  {#each $sortedMessages as { messageStore, viewModel: viewModelStore, id }, index (id)}
    {#if index === unreadMessageInfo.earliestUnreadMessageIndex}
      <div class="unread-messages-separator">
        {#if !unreadMessageInfo.hasOutboundMessageAfterEarliestUnreadMessage}
          {unreadMessageSeparatorLabel(unreadMessageInfo.inboundMessageCount)}
        {/if}
      </div>
    {:else if hasDirectionChanged($sortedMessages, index)}
      <div class="direction-change-separator" />
    {/if}

    <ConversationMessageComponent
      {messageStore}
      {viewModelStore}
      {receiver}
      {receiverLookup}
      {readObserver}
      selectable={false}
      {conversation}
      {services}
    />
  {:else}
    <SystemMessage>
      <MdIcon slot="icon" theme="Outlined">info</MdIcon>
      This chat is linked with your mobile device.<br />
      All future messages will appear here.
    </SystemMessage>
  {/each}
</template>

<style lang="scss">
  @use 'component' as *;

  .unread-messages-separator {
    color: var(--t-color-primary);
    display: flex;
    align-items: center;
    text-align: center;
    margin-top: #{rem(5px)};
    margin-bottom: #{rem(5px)};
    &::before,
    &::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--t-color-primary);
    }
    &::before {
      margin-left: #{rem(10px)};
    }
    &::after {
      margin-right: #{rem(10px)};
    }
    &:empty {
      margin-top: #{rem(15px)};
      margin-bottom: #{rem(15px)};
    }
    &:not(:empty) {
      &::before {
        margin-right: #{rem(10px)};
      }
      &::after {
        margin-left: #{rem(10px)};
      }
    }
  }
</style>
