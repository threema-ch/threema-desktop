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
  import {appVisibility} from '~/common/dom/ui/state';
  import {MessageDirection} from '~/common/enum';
  import {type Conversation} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type u53} from '~/common/types';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {debounce} from '~/common/utils/timer';
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

  let sortedMessages: SortedMessageListStore;
  let unreadMessageInfo: UnreadMessageInfo;

  function setUnreadMessageInfo(messageList: SortedMessageList): void {
    unreadMessageInfo = getUnreadMessageInfo($conversation, messageList, unreadMessageInfo);
  }

  $: {
    sortedMessages = sortMessages(conversationMessagesSet);
    setUnreadMessageInfo($sortedMessages);
    scheduleUnreadMessageInfoRecountDebounced();
  }

  function scheduleUnreadMessageInfoRecount(): void {
    unreadMessageInfo.isRecountPending = true;
  }

  const DEBOUNCE_TIMEOUT_TO_RECOUNT_UNREAD_SEPARATOR_MILLIS = 2 * 60 * 1000; // 2 minutes

  /**
   * Ensure that two minutes after the last inbound or outbound message the unread message separator
   * is recalculated so that it is relevant.
   */
  const scheduleUnreadMessageInfoRecountDebounced = debounce(
    scheduleUnreadMessageInfoRecount,
    DEBOUNCE_TIMEOUT_TO_RECOUNT_UNREAD_SEPARATOR_MILLIS,
  );

  function unscheduleUnreadMessageInfoRecount(): void {
    unreadMessageInfo.isRecountPending = false;
  }

  $: if ($appVisibility !== 'focused') {
    scheduleUnreadMessageInfoRecount();
  } else {
    unscheduleUnreadMessageInfoRecount();
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

  $: if ($appVisibility === 'focused') {
    void markAllMessagesAsRead($sortedMessages);
  }

  /**
   * Mark all messages as read. For now, this function marks each message individually to take
   * advantage of the already existing mechanism to reflect the action to the peer devices. A future
   * optimization could involve marking all unread messages at once and sending all message ids in a
   * batch update.
   *
   * Note: For performance reasons (i.e. to avoid checking all messages of a conversation every
   * time) this function starts from the most recent message and assumes that there are no more
   * messages left unread as soon as it reaches either an outbound message or an inbound message
   * that is already marked as read.
   *
   * @param messages The conversation messages sorted from oldest to newest, i.e. as
   * {@link SortedMessageList}.
   */
  async function markAllMessagesAsRead(messages: SortedMessageList): Promise<void> {
    if ($conversation.view.unreadMessageCount === 0) {
      return;
    }

    for (let index = messages.length - 1; index >= 0; index--) {
      const messageStore = messages[index].messageStore;

      if (messageStore.ctx === MessageDirection.OUTBOUND) {
        // We reached the most recent outbound message so we can assume that all previous messages
        // were flagged as read and we can stop the loop.
        return;
      }

      const message = messageStore.get();

      if (message.view.readAt !== undefined) {
        // We reached the most recent inbound message that was already read so we can assume that
        // all previous messages were flagged as read and we can stop the loop.
        return;
      }

      // Await instead of 'void' here to prevent race conditions with the scheduled tasks to reflect the read state.
      await message.controller.read.fromLocal(new Date());
    }
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
