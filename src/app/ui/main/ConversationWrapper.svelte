<script lang="ts">
  import DropZone from '#3sc/components/blocks/DropZone/DropZone.svelte';
  import {type ForwardedMessageLookup, ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import Conversation from '~/app/ui/main/conversation/Conversation.svelte';
  import Welcome from '~/app/ui/main/Welcome.svelte';
  import {type MediaFile} from '~/app/ui/modal/media-message';
  import MediaMessage from '~/app/ui/modal/MediaMessage.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type DbReceiverLookup} from '~/common/db';
  import {ReceiverType} from '~/common/enum';
  import {type AnyReceiverStore} from '~/common/model';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationViewModel} from '~/common/viewmodel/conversation';

  export let services: AppServices;

  // Unpack services and backend
  const {router, backend} = services;

  let mediaMessageDialogVisible = false;
  let mediaFiles: MediaFile[] = [];

  function openMediaMessageDialog(files: File[]): void {
    mediaFiles = files.map((file) => ({
      file,
    }));
    mediaMessageDialogVisible = true;
  }

  // Get conversation lookup info
  let receiverLookup: DbReceiverLookup;
  let forwardedMessageLookup: ForwardedMessageLookup | undefined;

  $: if ($router.main.id === 'conversation') {
    const route = $router.main;
    receiverLookup = route.params.receiverLookup;
    forwardedMessageLookup = route.params.forwardedMessage;
  }

  let conversationViewModel: Remote<ConversationViewModel> | undefined;
  let receiver: Remote<AnyReceiverStore> | undefined;

  // Look up conversation
  $: if (receiverLookup !== undefined) {
    void backend.viewModel.conversation(receiverLookup).then((conversationViewModelParam) => {
      if (conversationViewModelParam === undefined) {
        // Show toast and navigate to welcome page
        toast.addSimpleFailure(`Conversation not found`);
        router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined));
        return;
      }

      conversationViewModel = conversationViewModelParam;
      receiver = conversationViewModelParam.receiver;
    });
  }

  let zoneHover = false;
  let bodyHover = false;
  $: zoneHover = zoneHover;
</script>

<svelte:body
  on:threema-drag-start={() => {
    bodyHover = true;
  }}
  on:threema-drag-end={() => {
    bodyHover = false;
  }}
/>

<template>
  {#if conversationViewModel !== undefined && receiver !== undefined && $receiver !== undefined}
    <DropZone bind:zoneHover on:fileDrop={(event) => openMediaMessageDialog(event.detail)}>
      <div class="drag-wrapper" class:bodyHover>
        <Conversation
          {conversationViewModel}
          {receiverLookup}
          {forwardedMessageLookup}
          {services}
          on:fileDrop={(event) => openMediaMessageDialog(event.detail)}
        />

        {#if zoneHover || bodyHover}
          <div class="drop-wrapper" class:zoneHover class:bodyHover>
            <div class="border">Drop files here to send</div>
          </div>
        {/if}
      </div>
    </DropZone>

    {#if mediaMessageDialogVisible}
      <MediaMessage
        title={`Send File to ${
          $receiver.type === ReceiverType.DISTRIBUTION_LIST
            ? $receiver.view.stub
            : $receiver.view.displayName
        }`}
        {mediaFiles}
        bind:visible={mediaMessageDialogVisible}
      />
    {/if}
  {:else}
    <Welcome />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .drag-wrapper {
    height: 100%;
    overflow: auto;

    &.bodyHover {
      position: relative;
    }
    .drop-wrapper {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;

      &.bodyHover {
        display: block;
        padding: rem(8px);
        background-color: var(--t-main-background-color);

        .border {
          @extend %font-h5-400;
          display: grid;
          align-items: center;
          justify-items: center;
          width: 100%;
          height: 100%;
          border-radius: rem(8px);
          border: rem(2px) solid $consumer-green-600;
        }
      }
      &.zoneHover {
        .border {
          background-color: rgba($consumer-green-600, 10%);
        }
      }
    }
  }
</style>
