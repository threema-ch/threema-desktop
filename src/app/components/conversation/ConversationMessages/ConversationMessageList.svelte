<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {
    type SortedMessageListStore,
    hasDirectionChanged,
    sortMessages,
  } from '~/app/components/conversation/ConversationMessages';
  import ConversationMessageComponent from '~/app/components/conversation/ConversationMessages/ConversationMessage.svelte';
  import Notification from '~/app/components/conversation/Notification.svelte';
  import {type AppServices} from '~/app/types';
  import {type DbReceiverLookup} from '~/common/db';
  import {type Conversation} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-messages';

  import {type ConversationData} from '..';

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
  $: sortedMessages = sortMessages(conversationMessagesSet);
</script>

<template>
  {#if $sortedMessages.length === 0}
    <Notification>
      <MdIcon slot="icon" theme="Outlined">info</MdIcon>
      This chat is linked with your mobile device.<br />
      All future messages will appear here.
    </Notification>
  {/if}

  {#each $sortedMessages as { messageStore, viewModel: viewModelStore, id }, index (id)}
    {#if hasDirectionChanged($sortedMessages, index)}
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
  {/each}
</template>
