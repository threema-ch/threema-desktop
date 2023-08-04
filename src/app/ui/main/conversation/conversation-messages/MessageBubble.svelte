<script lang="ts">
  import {
    isIncoming,
    isMultiUserConversation,
  } from '~/app/ui/main/conversation/conversation-messages';
  import MessageBody from '~/app/ui/main/conversation/conversation-messages/MessageBody.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import {type AnyReceiverStore} from '~/common/model';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

  /**
   * Bundle containing the viewModel and viewModelController.
   */
  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  /**
   * The Conversation's receiver.
   */
  export let receiver: Remote<AnyReceiverStore>;

  const viewModelStore = viewModelBundle.viewModel;

  $: message = $viewModelStore.body;
</script>

<template>
  <div class="container" class:contains-image={message.type === 'image'}>
    <!-- Sender name (only displayed for incoming messages in a multi-user conversation) -->
    {#if isIncoming(message) && isMultiUserConversation(receiver.type)}
      <div class="sender">
        <MessageContact name={message.sender.name} color={message.sender.profilePicture.color} />
      </div>
    {/if}

    <MessageBody {viewModelBundle} {receiver} />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    padding: rem(8px);

    .sender {
      margin-bottom: rem(4px);
    }

    &.contains-image {
      padding: rem(3px);
    }
  }
</style>
