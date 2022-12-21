<script lang="ts">
  import {onDestroy} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type AppServices} from '~/app/types';
  import {
    type SortedMessageList,
    type SortedMessageListStore,
    getUnreadMessageInfo,
    hasDirectionChanged,
    isLastMessageOutbound,
    isLastOutboundMessageOlderThan,
    sortMessages,
    unsetUnreadMessageInfo,
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
  import {derive} from '~/common/utils/store/derived-store';
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

  /**
   * A store that only triggers updates when the conversation ID changes.
   *
   * Note that the `conversation` store will trigger updates for many other things, such as changing
   * the number of unread messages.
   */
  const conversationId = derive(conversation, (c) => c.ctx);

  let sortedMessages: SortedMessageListStore;
  let unreadMessageInfo = unsetUnreadMessageInfo;

  const conversationIdUnsubscribe = conversationId.subscribe(() => {
    // Reset unreadMessageInfo when changing conversations.
    unreadMessageInfo = unsetUnreadMessageInfo;
  });
  onDestroy(conversationIdUnsubscribe);

  function setUnreadMessageInfo(messageList: SortedMessageList): void {
    const currentUnreadMessageInfo = unreadMessageInfo;

    if (isLastMessageOutbound(messageList)) {
      // Cancel forced recounting if the last message is outbound.
      currentUnreadMessageInfo.isRecountPending = false;
    }

    unreadMessageInfo = getUnreadMessageInfo($conversation, messageList, currentUnreadMessageInfo);
  }

  /**
   * Determine if the unread message info should be calculated, as there are many different cases.
   */
  function shouldSetUnreadMessageInfo(messageList: SortedMessageList): boolean {
    const isUnreadMessageLineCurrentlyDisplayed =
      unreadMessageInfo.earliestUnreadMessageIndex !== undefined;
    return (
      unreadMessageInfo.isUnset ||
      $appVisibility !== 'focused' ||
      isUnreadMessageLineCurrentlyDisplayed ||
      isLastOutboundMessageOlderThan(
        messageList,
        DEBOUNCE_TIMEOUT_TO_RECOUNT_UNREAD_SEPARATOR_MILLIS,
      )
    );
  }

  const DEBOUNCE_TIMEOUT_TO_RECOUNT_UNREAD_SEPARATOR_MILLIS = 2 * 60 * 1000; // 2 minutes

  /**
   * Ensure that some give time (i.e. {@link DEBOUNCE_TIMEOUT_TO_RECOUNT_UNREAD_SEPARATOR_MILLIS})
   * after the last inbound message the unread message separator is recalculated so that it is
   * relevant.
   */
  const scheduleUnreadMessageInfoRecount = debounce(() => {
    unreadMessageInfo.isRecountPending = true;
  }, DEBOUNCE_TIMEOUT_TO_RECOUNT_UNREAD_SEPARATOR_MILLIS);

  function scheduleUnreadMessageInfoRecountWhenFocused(): void {
    if ($appVisibility === 'focused') {
      scheduleUnreadMessageInfoRecount();
    }
  }

  $: {
    sortedMessages = sortMessages(conversationMessagesSet);

    if (shouldSetUnreadMessageInfo($sortedMessages)) {
      setUnreadMessageInfo($sortedMessages);
      scheduleUnreadMessageInfoRecountWhenFocused();
    }
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
   * advantage of the already existing mechanism to reflect the action to the peer devices.
   *
   * TODO(WEBMD-892): Mark all unread messages at once and sending all message ids in a batch
   * update.
   *
   * @param messages The conversation messages sorted from oldest to newest, i.e. as
   *   {@link SortedMessageList}.
   */
  async function markAllMessagesAsRead(messages: SortedMessageList): Promise<void> {
    let unreadMessageCount = $conversation.view.unreadMessageCount;

    if (unreadMessageCount < 1) {
      return;
    }

    // TODO(WEBMD-892): Remove this loop
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageStore = messages[i].messageStore;

      if (messageStore.ctx === MessageDirection.OUTBOUND) {
        // Message can't be unread if it's outbound
        continue;
      }

      const message = messageStore.get();

      if (message.view.readAt !== undefined) {
        // Message is already read
        continue;
      }

      await message.controller.read.fromLocal(new Date());
      unreadMessageCount--;
      if (unreadMessageCount < 1) {
        return;
      }
    }
  }
</script>

<template>
  {#each $sortedMessages as { messageStore, viewModel: viewModelStore, id }, index (id)}
    {#if index === unreadMessageInfo.earliestUnreadMessageIndex}
      <div class="unread-messages-separator">
        {#if !unreadMessageInfo.hasOutboundMessageAfterEarliestUnreadMessage}
          {unreadMessageSeparatorLabel(unreadMessageInfo.inboundUnreadMessageCount)}
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
    &:empty {
      opacity: 0.4;
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
