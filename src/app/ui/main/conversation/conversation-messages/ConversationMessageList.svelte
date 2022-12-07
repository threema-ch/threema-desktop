<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {
    type SortedMessageListStore,
    hasDirectionChanged,
    sortMessages,
  } from '~/app/ui/main/conversation/conversation-messages';
  import ConversationMessageComponent from '~/app/ui/main/conversation/conversation-messages/ConversationMessage.svelte';
  import SystemMessage from '~/app/ui/main/conversation/conversation-messages/SystemMessage.svelte';
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
  {:else}
    <SystemMessage>
      <MdIcon slot="icon" theme="Outlined">info</MdIcon>
      This chat is linked with your mobile device.<br />
      All future messages will appear here.
    </SystemMessage>
  {/each}
</template>
