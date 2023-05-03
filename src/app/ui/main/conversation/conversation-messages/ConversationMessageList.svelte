<script lang="ts">
  import {onDestroy} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type AppServices} from '~/app/types';
  import {
    getUnreadMessageInfo,
    hasDirectionChanged,
    isLastMessageOutbound,
    isLastOutboundMessageOlderThan,
    type SortedMessageList,
    type SortedMessageListStore,
    sortMessages,
    unsetUnreadMessageInfo,
  } from '~/app/ui/generic/form';
  import {i18n} from '~/app/ui/i18n';
  import ConversationMessageComponent from '~/app/ui/main/conversation/conversation-messages/ConversationMessage.svelte';
  import SystemMessage from '~/app/ui/main/conversation/conversation-messages/SystemMessage.svelte';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {type DbReceiverLookup} from '~/common/db';
  import {appVisibility} from '~/common/dom/ui/state';
  import {type AnyReceiverStore, type Conversation} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type Remote} from '~/common/utils/endpoint';
  import {derive} from '~/common/utils/store/derived-store';
  import {debounce} from '~/common/utils/timer';
  import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-message-set';

  /**
   * App services.
   */
  export let services: AppServices;

  /**
   * Conversation Messages
   */
  export let conversationMessagesSet: Remote<ConversationMessageSetStore>;

  /**
   * The Conversation's receiver
   */
  export let receiver: Remote<AnyReceiverStore>;

  /**
   * Current receiver lookup
   */
  export let receiverLookup: DbReceiverLookup;

  /**
   * The parent conversation, to which this message belongs.
   */
  export let conversation: RemoteModelStore<Conversation>;

  /**
   * The reference to the element which contains this message list.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  export let container: HTMLElement | null;

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

  $: if ($appVisibility === 'focused') {
    void $conversation.controller.read.fromLocal(new Date());
  }
</script>

<template>
  {#each $sortedMessages as { messageStore, viewModel: viewModelStore, id }, index (id)}
    {#if index === unreadMessageInfo.earliestUnreadMessageIndex}
      <div class="unread-messages-separator">
        {#if !unreadMessageInfo.hasOutboundMessageAfterEarliestUnreadMessage}
          {$i18n.t(
            'messaging.label--unread-messages-count',
            '{n, plural, =0 {} =1 {1 New Message} other {# New Messages}}',
            {n: unreadMessageInfo.inboundUnreadMessageCount},
          )}
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
      {services}
      {container}
      on:quoteMessage
      on:deleteMessage
    />
  {:else}
    <SystemMessage>
      <MdIcon slot="icon" theme="Outlined">info</MdIcon>
      <SubstitutableText
        text={$i18n.t(
          'messaging.markup--chat-empty-state',
          'This chat is linked with your mobile device. <1/>All future messages will appear here.',
        )}
      >
        <br slot="1" />
      </SubstitutableText>
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
