<script lang="ts">
  import DropZone from '#3sc/components/blocks/DropZone/DropZone.svelte';
  import {type ForwardedMessageLookup, ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import Conversation from '~/app/ui/main/conversation/Conversation.svelte';
  import Welcome from '~/app/ui/main/Welcome.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type DbReceiverLookup} from '~/common/db';
  import {type AnyReceiverStore} from '~/common/model';
  import {type Remote} from '~/common/utils/endpoint';
  import {
    type ConversationViewModel,
    type IConversationViewModelController,
    type SendMessageEventDetail,
  } from '~/common/viewmodel/conversation';

  export let services: AppServices;

  // Unpack services and backend
  const {router, backend} = services;

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
  let viewModelController: Remote<IConversationViewModelController> | undefined;

  // Look up conversation
  $: {
    void backend.viewModel.conversation(receiverLookup).then((conversationViewModelParam) => {
      if (conversationViewModelParam === undefined) {
        // Show toast and navigate to welcome page
        toast.addSimpleFailure(
          i18n.get().t('messaging.error--conversation-not-found', 'Conversation not found'),
        );
        router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
        return;
      }

      conversationViewModel = conversationViewModelParam;
      receiver = conversationViewModelParam.receiver;
      viewModelController = conversationViewModelParam.viewModelController;
    });
  }

  let conversationElement: Conversation;

  async function sendMessage(event: CustomEvent<SendMessageEventDetail>): Promise<void> {
    await viewModelController?.sendMessage(event.detail);
  }

  let mediaMessageDialogVisible = false;
  let zoneHover = false;
  let bodyHover = false;
  $: zoneHover = zoneHover;
</script>

<svelte:body
  on:threemadragstart={() => {
    bodyHover = true;
  }}
  on:threemadragend={() => {
    bodyHover = false;
  }}
/>

<template>
  {#if conversationViewModel !== undefined && receiver !== undefined && $receiver !== undefined}
    <DropZone
      bind:zoneHover
      on:fileDrop={(event) => {
        conversationElement.handleFileDrop(event.detail);
      }}
    >
      <div class="drag-wrapper" class:bodyHover>
        <Conversation
          bind:this={conversationElement}
          bind:mediaMessageDialogVisible
          {conversationViewModel}
          {receiverLookup}
          {forwardedMessageLookup}
          {services}
          on:sendMessage={sendMessage}
        />

        {#if (zoneHover || bodyHover) && !mediaMessageDialogVisible}
          <div class="drop-wrapper" class:zoneHover class:bodyHover>
            <div class="border">
              {$i18n.t('messaging.hint--drop-files-to-send', 'Drop files here to send')}
            </div>
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
