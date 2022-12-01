<script lang="ts">
  import DropZone from '#3sc/components/blocks/DropZone/DropZone.svelte';
  import Conversation from '~/app/components/conversation/Conversation.svelte';
  import Welcome from '~/app/components/panels/main/Welcome.svelte';
  import {toast} from '~/app/components/snackbar';
  import {type ForwardedMessageLookup, ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {type DbReceiverLookup} from '~/common/db';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {type ConversationViewModel} from '~/common/viewmodel/conversation';

  export let services: AppServices;

  // Unpack services and backend
  const {router, backend} = services;

  function dropContent(event: DragEvent): void {
    const transfer = event.dataTransfer;
    if (transfer !== null) {
      const data = {
        files: [...Array(transfer.files.length)].map((_, index) => transfer.files[index]),
        items: [...Array(transfer.items.length)].map((_, index) => transfer.items[index]),
      };
      // TODO(WEBMD-195): Handle file content
      // eslint-disable-next-line no-console
      console.warn('Dropped:', data);
    }
  }

  // Get conversation lookup info
  let receiverLookup: DbReceiverLookup;
  let forwardedMessageLookup: ForwardedMessageLookup | undefined;

  $: if ($router.main.id === 'conversation') {
    const route = $router.main;
    receiverLookup = route.params.receiverLookup;
    forwardedMessageLookup = route.params.forwardedMessage;
  }

  let conversationViewModel: RemoteObject<ConversationViewModel> | undefined;

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
  {#if conversationViewModel !== undefined}
    <DropZone bind:zoneHover on:drop={dropContent}>
      <div class="drag-wrapper" class:bodyHover>
        <Conversation
          {conversationViewModel}
          {receiverLookup}
          {forwardedMessageLookup}
          {services}
        />
        {#if zoneHover || bodyHover}
          <div class="drop-wrapper" class:zoneHover class:bodyHover>
            <div class="border">Drop files here to send</div>
          </div>
        {/if}
      </div>
    </DropZone>
  {:else}
    <Welcome />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;
  .drag-wrapper {
    height: 100%;

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
