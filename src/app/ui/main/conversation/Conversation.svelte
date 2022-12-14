<script lang="ts">
  import {onDestroy} from 'svelte';
  import {type Writable} from 'svelte/store';

  import {type ComposeData, type ComposeMode} from '~/app/ui/main/conversation/compose';
  import ComposeAreaWrapper from '~/app/ui/main/conversation/compose/ComposeAreaWrapper.svelte';
  import {conversationDrafts} from '~/app/ui/main/conversation';
  import ConversationMessageList from '~/app/ui/main/conversation/conversation-messages/ConversationMessageList.svelte';
  import ConversationTopBar from '~/app/ui/main/conversation/top-bar/ConversationTopBar.svelte';
  import {isInactiveGroup} from '~/app/ui/generic/receiver';
  import {type ForwardedMessageLookup, ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices, type SvelteAction} from '~/app/types';
  import {type DbReceiverLookup} from '~/common/db';
  import {appVisibility, display, layout} from '~/common/dom/ui/state';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ConversationCategory, MessageDirection} from '~/common/enum';
  import {
    type AnyMessageModelStore,
    type AnyReceiverStore,
    type Conversation,
    type RemoteModelStoreFor,
  } from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {randomMessageId} from '~/common/network/protocol/utils';
  import {ensureMessageId} from '~/common/network/types';
  import {assert} from '~/common/utils/assert';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {hexLeToU64} from '~/common/utils/number';
  import {WritableStore} from '~/common/utils/store';
  import {
    type ConversationViewModel,
    type InnerConversationViewModelStore,
  } from '~/common/viewmodel/conversation';

  import {conversationListEvent} from '.';

  /**
   * App services.
   */
  export let services: AppServices;
  const {backend, crypto, logging, router} = services;

  export let receiverLookup: DbReceiverLookup;

  export let forwardedMessageLookup: ForwardedMessageLookup | undefined;

  $: if (forwardedMessageLookup !== undefined) {
    void insertForwardedMessage(forwardedMessageLookup);
  }

  /**
   * The Conversation ViewModel
   */
  export let conversationViewModel: RemoteObject<ConversationViewModel>;

  /**
   * The conversation model store.
   */
  let conversation: RemoteModelStore<Conversation> = conversationViewModel.conversation;
  $: conversation = conversationViewModel.conversation;

  let receiver: RemoteObject<AnyReceiverStore> = conversationViewModel.receiver;
  $: receiver = conversationViewModel.receiver;

  let innerConversationViewModel: RemoteObject<InnerConversationViewModelStore> =
    conversationViewModel.viewModel;
  $: innerConversationViewModel = conversationViewModel.viewModel;

  let textComposeArea: ComposeAreaWrapper;

  // Logger
  const log = logging.logger('component.conversation');

  /**
   * Insert forwarded message: If route defines a forwarded message, insert it into the compose area
   */
  async function insertForwardedMessage(fwdLookup: ForwardedMessageLookup): Promise<void> {
    if (fwdLookup === undefined) {
      return;
    }

    const forwardedConversation = await backend.model.conversations.getForReceiver(
      fwdLookup.receiverLookup,
    );
    if (forwardedConversation === undefined) {
      return;
    }

    const fwdMessage = await forwardedConversation.get().controller.getMessage(fwdLookup.messageId);
    if (fwdMessage === undefined) {
      return;
    }

    const forwardedMessage = fwdMessage.get();
    if (forwardedMessage.type === 'text') {
      textComposeArea.clearText();
      textComposeArea.insertText(forwardedMessage.view.text);
    }
  }

  /**
   * Send a text message.
   */
  function sendTextMessage(ev: CustomEvent<string>): void {
    const text = ev.detail;

    // Do not send empty messages
    if (text.trim() === '') {
      return;
    }

    const id = randomMessageId(crypto);
    log.debug(`Send text message with id ${id}`);
    void conversation.get().controller.addMessage.fromLocal({
      direction: MessageDirection.OUTBOUND,
      type: 'text',
      id,
      createdAt: new Date(),
      text,
    });

    if ($router.nav?.id !== 'conversationList') {
      // Set Nav to Conversation Preview List
      router.replaceNav(ROUTE_DEFINITIONS.nav.conversationList.withTypedParams(undefined));
    }

    // Dispatch an event to scroll the conversation list all the way to the top
    conversationListEvent.post({action: 'scroll-to-top'});

    // Clear draft
    conversationDraftStore.set(undefined);

    // Scroll to the bottom of the conversation when sending a new message.
    anchorActive = true;
  }

  let conversationDraftStore = conversationDrafts.getOrCreateStore(receiverLookup);

  // Compose mode and data
  //
  // TODO(WEBMD-306): If a draft is available for the current receiver, initialize it here (set the
  // text appropriately).
  const composeMode: ComposeMode = 'text';
  const composeData: Writable<ComposeData> = new WritableStore({
    text: $conversationDraftStore,
    attachment: undefined,
  });

  // Determine whether scroll snapping anchor is active.
  let anchorActive = true;

  /**
   * Detect and switch if the scroll snapping anchor should be active based on element visibility.
   */
  function scrollSnap(node: HTMLElement): SvelteAction {
    // Make sure that the scroll anchor is initially visible if active
    if (anchorActive) {
      scrollToCenterOfView(node);
    }

    // Activate scroll anchor if it is visible in the viewport and vice versa
    const observer = new IntersectionObserver(([entry]) => {
      anchorActive = entry.isIntersecting;
    });
    observer.observe(node);

    return {
      destroy: () => {
        observer.disconnect();
      },
    };
  }

  // Mark messages as read as soon as the customer focus the app again
  const messagesToMarkAsReadQueue: Promise<
    RemoteModelStoreFor<AnyMessageModelStore> | undefined
  >[] = [];

  $: if ($appVisibility === 'focused') {
    while (messagesToMarkAsReadQueue.length > 0) {
      const msg = messagesToMarkAsReadQueue.pop();
      if (msg !== undefined) {
        void flagMessageAsRead(msg);
      }
    }
  }

  /**
   * Mark a promised message as read, if it is an inbound message.
   *
   * Note: This does a RPC-call to the backend.
   */
  async function flagMessageAsRead(
    msg: Promise<RemoteModelStoreFor<AnyMessageModelStore> | undefined>,
  ): Promise<void> {
    const message = await msg;
    if (message?.ctx === MessageDirection.INBOUND) {
      await message?.get().controller.read.fromLocal(new Date());
    }
  }

  /**
   * This function is called every time an observed message comes into view.
   *
   * Implements {@link IntersectionObserverCallback}. See
   * https://w3c.github.io/IntersectionObserver/#intersection-observer-api for more details.
   */
  function observeMessageContainer(
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ): void {
    const visibleEntries = entries.filter((entry) => entry.isIntersecting);

    // Unsubscribe element subscribers
    for (const element of visibleEntries) {
      observer.unobserve(element.target);
    }

    // Get MessageIDs
    const readMessageIds = visibleEntries.map((entry) => {
      const messageContainer = entry.target as HTMLDivElement;
      const stringMessageId = messageContainer.dataset.id;
      assert(stringMessageId !== undefined, 'Conversation message must have a messageId');
      return ensureMessageId(hexLeToU64(stringMessageId));
    });

    // Asynchronously fetch message stores
    const messageStorePromises = readMessageIds.map(
      async (messageId) => await conversation.get().controller.getMessage(messageId),
    );

    // Mark messages as read (asynchronously) or add them to the queue
    for (const messageStorePromise of messageStorePromises) {
      if ($appVisibility === 'focused') {
        void flagMessageAsRead(messageStorePromise);
      } else {
        messagesToMarkAsReadQueue.push(messageStorePromise);
      }
    }
  }

  // Start message read intersection observer
  const readObserver = new IntersectionObserver(observeMessageContainer, {
    threshold: 0.0,
  });

  /**
   * Save the message draft for the specified receiver and clear the compose area.
   */
  function saveMessageDraftAndClear(draftReceiverLookup: DbReceiverLookup): void {
    conversationDraftStore = conversationDrafts.getOrCreateStore(draftReceiverLookup);
    // Compose area does not exist on detail view in <large mode,
    // or, when an inactive group is displayed
    if (!isTextComposeArea(textComposeArea)) {
      return;
    }

    // Save current message draft
    const currentDraft = textComposeArea.getText();
    conversationDraftStore.set(currentDraft === '' ? undefined : currentDraft);
    textComposeArea.clearText();
  }

  // Detect route changes
  let lastReceiverLookup = receiverLookup;

  function isTextComposeArea(x: unknown): x is ComposeAreaWrapper {
    return x !== undefined && x !== null && x instanceof ComposeAreaWrapper;
  }

  // TODO(WEBMD-306): Replace with the real message drafts
  const routerUnsubscribe = router.subscribe((route) => {
    const displayMode = display.get();
    const layoutMode = layout.get();
    const isComposeAreaRoute = ['main', 'nav-main', 'nav-main-aside'].includes(
      layoutMode[displayMode],
    );
    // Only on conversation route
    if (route.main.id === 'conversation' && isComposeAreaRoute) {
      // Get receiver lookup params
      const currentReceiverLookup = route.main.params.receiverLookup;
      const newRoute = lastReceiverLookup !== currentReceiverLookup;
      // Route has changed
      if (newRoute) {
        // Save old draft
        saveMessageDraftAndClear(lastReceiverLookup);
        // Save new receiver data
        lastReceiverLookup = currentReceiverLookup;
        // Get saved draft message
        conversationDraftStore = conversationDrafts.getOrCreateStore(currentReceiverLookup);
        const draftMessage = conversationDraftStore.get();
        // Javascript at it's best
        setTimeout(() => {
          if (isTextComposeArea(textComposeArea)) {
            textComposeArea.insertText(draftMessage ?? '');
            textComposeArea.focus();
          }
        }, 0);
        // No route change, BUT empty compose area (may be a change of aside to main with medium/small layout)
      } else if (isTextComposeArea(textComposeArea) && textComposeArea.getText() === '') {
        conversationDraftStore = conversationDrafts.getOrCreateStore(currentReceiverLookup);
        const draftMessage = conversationDraftStore.get();
        textComposeArea.insertText(draftMessage ?? '');
        textComposeArea.focus();
      }
    }
  });

  onDestroy(() => {
    saveMessageDraftAndClear(lastReceiverLookup);
    routerUnsubscribe();
    readObserver.disconnect();
  });
</script>

<template>
  <div
    class="conversation"
    data-private={$conversation.view.category === ConversationCategory.PROTECTED}
  >
    <div class="top-bar">
      <ConversationTopBar
        receiver={$innerConversationViewModel.receiver}
        isInactiveGroup={isInactiveGroup($receiver)}
        {receiverLookup}
        {services}
      >
        <span class="top-title" slot="title">Conversation title</span>
      </ConversationTopBar>
    </div>
    {#if $conversation.view.category === ConversationCategory.PROTECTED}
      <div class="private">
        <div class="box">
          <div class="header">Private Chat</div>
          <div class="body">Private chats are not supported in {import.meta.env.APP_NAME}.</div>
        </div>
      </div>
    {:else}
      <div class="messages">
        {#await conversationViewModel.viewModelController.getConversationMessagesSetStore() then conversationMessagesSet}
          <ConversationMessageList
            {conversationMessagesSet}
            {receiverLookup}
            receiver={$innerConversationViewModel.receiver}
            {readObserver}
            {conversation}
            {services}
          />
        {/await}
        <div class="anchor" class:active={anchorActive} use:scrollSnap />
      </div>
      <div class="bottom-bar">
        {#if isInactiveGroup($receiver)}
          <div class="deleted-group-message">You are no longer part of this group.</div>
        {:else if composeMode === 'text'}
          <ComposeAreaWrapper
            bind:this={textComposeArea}
            initialText={$composeData.text}
            on:recordAudio={() => {
              // TODO(WEBMD-196)
            }}
            on:attachData={() => {
              // TODO(WEBMD-303)
            }}
            on:sendMessage={sendTextMessage}
          />
        {/if}
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .conversation {
    display: grid;
    grid-template:
      'top-bar' rem(64px)
      'messages' 1fr
      '.' rem(1px)
      'bottom-bar' minmax(rem(64px), auto)
      / 100%;
    height: 100%;
    background-color: var(--t-panel-gap-color);
    overflow: inherit;

    &[data-private='true'] {
      grid-template:
        'top-bar' rem(64px)
        'private' 1fr
        '.' rem(1px);

      .private {
        grid-area: private;
        display: grid;
        place-items: center;

        .box {
          display: grid;
          grid-template:
            'header' auto
            'body' auto
            / auto;
          border-radius: rem(3px);
          overflow: hidden;
          @extend %elevation-060;

          .header {
            @extend %font-h5-400;
            background-color: #ff5722;
            padding: 20px 10px;
          }
          .body {
            padding: 10px;
            background-color: var(--t-main-background-color);
          }
        }
      }
    }

    > * {
      background-color: var(--t-main-background-color);
    }

    .top-bar {
      grid-area: top-bar;
    }

    .top-title {
      display: grid;
      place-items: center;
    }

    .messages {
      grid-area: messages;
      scroll-snap-type: y mandatory;
      overflow-y: auto;
      display: grid;
      align-content: start;
      gap: rem(8px);

      .anchor {
        height: 1px;
        align-self: end;

        &.active {
          scroll-snap-align: end;
        }
      }
    }

    .bottom-bar {
      grid-area: bottom-bar;
      .deleted-group-message {
        text-align: center;
        margin: 1.5rem;
        opacity: 0.5;
        font-style: italic;
      }
    }
  }
</style>
