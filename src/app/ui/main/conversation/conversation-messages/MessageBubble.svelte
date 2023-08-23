<script lang="ts">
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import {
    isIncoming,
    isMultiUserConversation,
  } from '~/app/ui/main/conversation/conversation-messages';
  import MessageBody from '~/app/ui/main/conversation/conversation-messages/MessageBody.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageSyncProvider from '~/app/ui/main/conversation/conversation-messages/MessageSyncProvider.svelte';
  import ImageMessageViewer from '~/app/ui/modal/ImageMessageViewer.svelte';
  import {type AnyReceiverStore} from '~/common/model';
  import {assert} from '~/common/utils/assert';
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

  let isImageModalVisible = false;

  function handleClickImage({detail: event}: CustomEvent<MouseEvent>): void {
    event.stopPropagation();

    if (!isImageModalVisible) {
      isImageModalVisible = true;
    }
  }

  function handleCloseModal(): void {
    if (isImageModalVisible) {
      isImageModalVisible = false;
    }
  }

  function handleContextMenuAction(event: MouseEvent): void {
    event.preventDefault();

    // Prevent ancestor elements from receiving the `contextmenu` event.
    event.stopPropagation();
  }

  $: message = $viewModelStore.body;
</script>

<template>
  <MessageSyncProvider {viewModelBundle} on:syncrequest on:abortsyncrequest>
    <div class="container" class:contains-thumbnail={message.type === 'image'}>
      <!-- Sender name (only displayed for incoming messages in a multi-user conversation) -->
      {#if isIncoming(message) && isMultiUserConversation(receiver.type)}
        <div class="sender">
          <MessageContact name={message.sender.name} color={message.sender.profilePicture.color} />
        </div>
      {/if}
      <MessageBody {viewModelBundle} {receiver} on:clickfile on:clickimage={handleClickImage} />
    </div>
  </MessageSyncProvider>

  {#if isImageModalVisible}
    {assert(message.type === 'image')}
    <div class="modal" use:contextMenuAction={handleContextMenuAction}>
      <ImageMessageViewer
        messageViewModelController={viewModelBundle.viewModelController}
        mediaType={message.body.mediaType}
        dimensions={message.body.dimensions}
        on:clickclose={handleCloseModal}
        on:clicksave
        on:clickcopy
      />
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    padding: rem(8px);

    .sender {
      margin-bottom: rem(4px);
    }

    &.contains-thumbnail {
      padding: rem(3px);
    }
  }

  .modal {
    position: fixed;
    width: 100vw;
    height: 100vh;
    left: 0;
    top: 0;
    z-index: $z-index-modal;
  }
</style>
