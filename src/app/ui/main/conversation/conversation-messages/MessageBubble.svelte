<script lang="ts">
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import {
    isIncoming,
    isMultiUserConversation,
  } from '~/app/ui/main/conversation/conversation-messages';
  import MessageBody from '~/app/ui/main/conversation/conversation-messages/MessageBody.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageSyncProvider from '~/app/ui/main/conversation/conversation-messages/MessageSyncProvider.svelte';
  import MediaViewer from '~/app/ui/modal/media-message-viewer/MediaViewer.svelte';
  import type {AnyReceiverStore} from '~/common/model';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

  /**
   * Bundle containing the viewModel and viewModelController.
   */
  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  /**
   * The Conversation's receiver.
   */
  export let receiver: Remote<AnyReceiverStore>;

  const viewModelStore = viewModelBundle.viewModel;

  let isMediaViewerVisible = false;

  function handleClickThumbnail({detail: event}: CustomEvent<MouseEvent>): void {
    event.stopPropagation();

    if (!isMediaViewerVisible) {
      isMediaViewerVisible = true;
    }
  }

  function handleCloseModal(): void {
    if (isMediaViewerVisible) {
      isMediaViewerVisible = false;
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
    <div
      class="container"
      class:contains-thumbnail={message.type === 'image' || message.type === 'video'}
    >
      <!-- Sender name (only displayed for incoming messages in a multi-user conversation) -->
      {#if isIncoming(message) && isMultiUserConversation(receiver.type)}
        <div class="sender">
          <MessageContact
            name={message.sender.name}
            color={message.sender.profilePictureFallback.color}
          />
        </div>
      {/if}
      <MessageBody
        {viewModelBundle}
        {receiver}
        on:clickfile
        on:clickthumbnail={handleClickThumbnail}
      />
    </div>
  </MessageSyncProvider>

  {#if isMediaViewerVisible && (message.type === 'image' || message.type === 'video')}
    <div class="modal" use:contextMenuAction={handleContextMenuAction}>
      <MediaViewer {viewModelBundle} {message} on:clickclose={handleCloseModal} on:clicksave />
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
