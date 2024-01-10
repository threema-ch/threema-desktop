<script lang="ts">
  import {createEventDispatcher, onDestroy} from 'svelte';
  import type {Writable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '#3sc/utils/filelist';
  import {globals} from '~/app/globals';
  import {type ForwardedMessageLookup, ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import Quote from '~/app/ui/components/molecules/message/internal/quote/Quote.svelte';
  import ChatView from '~/app/ui/components/partials/chat-view/ChatView.svelte';
  import {getTextContent} from '~/app/ui/components/partials/chat-view/internal/message/helpers';
  import type {MessagePropsFromBackend} from '~/app/ui/components/partials/chat-view/transformers';
  import {isDisabledReceiver, isInactiveContact} from '~/app/ui/generic/receiver';
  import {i18n} from '~/app/ui/i18n';
  import {conversationDrafts, conversationListEvent} from '~/app/ui/main/conversation';
  import {getDefaultComposeData, type ComposeData} from '~/app/ui/main/conversation/compose';
  import ComposeHandler from '~/app/ui/main/conversation/compose/ComposeHandler.svelte';
  import ConversationTopBar from '~/app/ui/main/conversation/top-bar/ConversationTopBar.svelte';
  import {toast} from '~/app/ui/snackbar';
  import type {DbReceiverLookup} from '~/common/db';
  import {display, layout} from '~/common/dom/ui/state';
  import {ConversationCategory, ReceiverType} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import type {AnyReceiverStore, Conversation} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import {unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {WritableStore} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import type {
    ConversationViewModel,
    InnerConversationViewModelStore,
    SendMessageEventDetail,
  } from '~/common/viewmodel/conversation';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation');

  export let services: AppServices;
  const {backend, router} = services;

  export let conversationViewModel: Remote<ConversationViewModel>;
  export let receiverLookup: DbReceiverLookup;
  export let forwardedMessageLookup: ForwardedMessageLookup | undefined;

  /**
   * Whether the Media Message Dialog is visible.
   */
  export let mediaMessageDialogVisible: boolean;

  let chatViewComponent: ChatView;
  let composeHandler: ComposeHandler;
  let lastReceiverLookup = receiverLookup;
  let conversationDraftStore = conversationDrafts.getOrCreateStore(receiverLookup);

  $: conversationInnerViewModel = conversationViewModel.viewModel;

  // Compose mode and data
  //
  // TODO(DESK-306): If a draft is available for the current receiver, initialize it here (set the
  // text appropriately).
  const composeData: Writable<ComposeData> = new WritableStore(
    getDefaultComposeData($conversationDraftStore),
  );

  const dispatch = createEventDispatcher<{sendMessage: SendMessageEventDetail}>();

  /**
   * Open the media compose message dialog if accessible files have been dropped
   */
  export function handleFileDrop(fileResult: FileResult): void {
    composeHandler.handleFileDrop(fileResult);
  }

  /**
   * Set a message as the current quote.
   */
  function handleClickQuoteMessage(event: CustomEvent<MessagePropsFromBackend>): void {
    if (isDisabledReceiver($receiver) || $isReceiverBlockedStore) {
      log.warn('Cannot quote from a disabled or blocked receiver');
      return;
    }
    updateComposeData({
      mode: 'quote',
      quotedMessageProps: event.detail,
    });
    composeHandler.focus();
  }

  function handleMarkAllMessagesAsRead(): void {
    void conversation.get().controller.read.fromLocal(new Date());
  }

  /**
   * Delete a message and remove it from being quoted (in case it is).
   */
  function handleClickDeleteMessage(event: CustomEvent<MessagePropsFromBackend>): void {
    const messageId = event.detail.id;

    if ($composeData.mode === 'quote' && $composeData.quotedMessageProps.id === messageId) {
      updateComposeData({
        mode: 'text',
      });
    }

    conversation
      .get()
      .controller.removeMessage.fromLocal(messageId)
      .catch(() => {
        log.error('Could not delete message');
        toast.addSimpleFailure(
          $i18n.t('messaging.error--delete-message', 'Could not delete message'),
        );
      });
  }

  /**
   * Discard current quote.
   */
  function handleClickCloseQuote(_: MouseEvent): void {
    updateComposeData({mode: 'text'});
    composeHandler.focus();
  }

  /**
   * Send a text message.
   */
  function handleSendTextMessage(event: CustomEvent<string>): void {
    const text = event.detail;
    const quotedMessageId =
      $composeData.mode === 'quote' ? $composeData.quotedMessageProps.id : undefined;

    // Do not send empty messages.
    if (text.trim() === '') {
      return;
    }
    dispatch('sendMessage', {
      type: 'text',
      text,
      quotedMessageId,
    });

    // Clear draft and compose data.
    conversationDraftStore.set(undefined);
    composeData.set(getDefaultComposeData(undefined));

    executeSendMessageSideEffects();
  }

  /**
   * Insert forwarded message: If route defines a forwarded message, insert it into the compose
   * area.
   */
  async function insertForwardedMessage(forwardedLookup: ForwardedMessageLookup): Promise<void> {
    const forwardedConversation = await backend.model.conversations.getForReceiver(
      forwardedLookup.receiverLookup,
    );
    if (forwardedConversation === undefined) {
      return;
    }

    const forwardedMessageStore = await forwardedConversation
      .get()
      .controller.getMessage(forwardedLookup.messageId);
    if (forwardedMessageStore === undefined) {
      return;
    }

    const forwardedMessage = forwardedMessageStore.get();
    if (forwardedMessage.type === 'text') {
      composeHandler.clearText();
      composeHandler.insertText(forwardedMessage.view.text);
    }
  }

  /**
   * Actions which should be executed when a message is being sent.
   */
  function executeSendMessageSideEffects(): void {
    // Set Nav to Conversation Preview List.
    if ($router.nav.id !== 'conversationList') {
      router.replaceNav(ROUTE_DEFINITIONS.nav.conversationList.withoutParams());
    }

    // Dispatch an event to scroll the conversation list all the way to the top.
    conversationListEvent.post({action: 'scroll-to-top'});

    // Scroll chat view all the way to the bottom to display the sent message.
    void chatViewComponent.scrollToLast({
      behavior: 'instant',
      block: 'end',
    });
  }

  function updateComposeData(
    update:
      | {
          readonly mode: 'quote';
          readonly quotedMessageProps: MessagePropsFromBackend;
        }
      | {
          readonly mode: 'text';
          readonly text?: string;
        },
  ): void {
    composeData.update((currentData) => {
      let newData;
      switch (update.mode) {
        case 'quote':
          newData = {
            ...currentData,
            ...update,
            attachment: undefined,
          } as const;
          break;
        case 'text':
          newData = {
            ...currentData,
            mode: 'text',
            quotedMessageProps: undefined,
            text: update.text ?? currentData.text,
          } as const;
          break;
        default:
          unreachable(update);
      }
      return newData;
    });
  }

  /**
   * Save the message draft for the specified receiver and clear the compose area.
   */
  function saveMessageDraftAndClear(draftReceiverLookup: DbReceiverLookup): void {
    conversationDraftStore = conversationDrafts.getOrCreateStore(draftReceiverLookup);
    // Compose area does not exist on detail view in <large mode, or, when an inactive group is
    // displayed.
    if (!isComposeHandler(composeHandler)) {
      return;
    }

    // Save current message draft.
    const currentDraft = composeHandler.getText();
    conversationDraftStore.set(currentDraft?.trim() === '' ? undefined : currentDraft);
    composeHandler.clearText();
  }

  function isComposeHandler(x: unknown): x is ComposeHandler {
    return x !== undefined && x !== null && x instanceof ComposeHandler;
  }

  // TODO(DESK-306): Replace with the real message drafts
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
        updateComposeData(getDefaultComposeData(draftMessage));
        // Javascript at it's best
        setTimeout(() => {
          if (isComposeHandler(composeHandler)) {
            composeHandler.insertText(draftMessage ?? '');
            composeHandler.focus();
          }
        }, 0);
        // No route change, BUT empty compose area (may be a change of aside to main with medium/small layout)
      } else if (isComposeHandler(composeHandler) && composeHandler.getText() === '') {
        conversationDraftStore = conversationDrafts.getOrCreateStore(currentReceiverLookup);
        const draftMessage = conversationDraftStore.get();
        composeHandler.insertText(draftMessage ?? '');
        composeHandler.focus();
      }
    }
  });

  let conversation: RemoteModelStore<Conversation>;
  $: conversation = conversationViewModel.conversation;

  let receiver: Remote<AnyReceiverStore>;
  $: receiver = conversationViewModel.receiver;

  let innerConversationViewModel: Remote<InnerConversationViewModelStore>;
  $: innerConversationViewModel = conversationViewModel.viewModel;

  $: isReceiverBlockedStore = derive(
    conversationViewModel.viewModel,
    (viewModel) => viewModel.receiver.type === 'contact' && viewModel.receiver.isBlocked,
  );

  $: if (forwardedMessageLookup !== undefined) {
    void insertForwardedMessage(forwardedMessageLookup);
  }

  $: quoteHtmlContent = getTextContent(
    $composeData.quotedMessageProps?.text?.raw,
    $composeData.quotedMessageProps?.text?.mentions,
    $i18n.t,
  );

  onDestroy(() => {
    saveMessageDraftAndClear(lastReceiverLookup);
    routerUnsubscribe();
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
        isDisabled={isDisabledReceiver($receiver)}
        isInactive={isInactiveContact($receiver)}
        {conversation}
        {conversationViewModel}
        {receiverLookup}
        {services}
        isReceiverBlocked={$isReceiverBlockedStore}
      >
        <span class="top-title" slot="title">Conversation title</span>
      </ConversationTopBar>
    </div>
    {#if $conversation.view.category === ConversationCategory.PROTECTED}
      <div class="private">
        <div class="box">
          <div class="header">
            {$i18n.t(
              'dialog--unsupported-feature-protected-conversation.label--title',
              'Private Chat',
            )}
          </div>
          <div class="body">
            {$i18n.t(
              'dialog--unsupported-feature-protected-conversation.prose--description',
              'Private chats are not supported in {appName}.',
              {appName: import.meta.env.APP_NAME},
            )}
          </div>
        </div>
      </div>
    {:else}
      <div class="messages">
        {#await conversationViewModel.viewModelController.getConversationMessagesSetViewModel() then messageSetViewModel}
          <ChatView
            bind:this={chatViewComponent}
            conversation={{
              firstUnreadMessageId: $conversationInnerViewModel.firstUnreadMessageId,
              id: $conversation.ctx,
              isBlocked: $isReceiverBlockedStore,
              isDisabled: isDisabledReceiver($receiver),
              lastMessage: $conversationInnerViewModel.lastMessage,
              markAllMessagesAsRead: handleMarkAllMessagesAsRead,
              receiverLookup,
              type: receiver.type,
              unreadMessagesCount: $conversationInnerViewModel.unreadMessagesCount,
            }}
            {messageSetViewModel}
            {services}
            on:clickquote={handleClickQuoteMessage}
            on:clickforward
            on:clickdelete={handleClickDeleteMessage}
          />
        {/await}
      </div>
      <div class="bottom-bar">
        {#if isDisabledReceiver($receiver)}
          <div class="disabled-input-area">
            {#if $receiver.type === ReceiverType.CONTACT}
              {$i18n.t(
                'messaging.error--contact-invalid',
                'You cannot send a message to this contact because it is invalid.',
              )}
            {:else if $receiver.type === ReceiverType.GROUP}
              {$i18n.t(
                'messaging.error--group-membership',
                'You are no longer part of this group.',
              )}
            {:else if $receiver.type === ReceiverType.DISTRIBUTION_LIST}
              <!-- TODO(DESK-771): Support distribution lists -->
            {:else}
              {unreachable($receiver)}
            {/if}
          </div>
        {:else if $isReceiverBlockedStore}
          <div class="disabled-input-area">
            {$i18n.t(
              'messaging.error--contact-blocked',
              'You cannot send a message to this contact because it is blocked.',
            )}
          </div>
          <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
        {:else if $composeData.mode === 'text' || $composeData.mode === 'quote'}
          {#if $composeData.mode === 'quote'}
            <div class="quote">
              {#key $composeData.quotedMessageProps.id}
                <div class="body">
                  <Quote
                    alt={$i18n.t('messaging.hint--media-thumbnail')}
                    content={quoteHtmlContent === undefined
                      ? undefined
                      : {
                          sanitizedHtml: quoteHtmlContent,
                        }}
                    file={$composeData.quotedMessageProps.file}
                    onError={(error) =>
                      log.error(
                        `An error occurred in a child component: ${extractErrorMessage(
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                          error,
                          'short',
                        )}`,
                      )}
                    sender={$composeData.quotedMessageProps.sender}
                  />
                </div>
              {/key}
              <IconButton flavor="naked" on:click={handleClickCloseQuote}>
                <MdIcon theme="Filled">close</MdIcon>
              </IconButton>
            </div>
          {/if}
          <ComposeHandler
            bind:this={composeHandler}
            bind:mediaMessageDialogVisible
            initialText={$composeData.text}
            displayAttachmentButton={$composeData.mode !== 'quote'}
            {receiver}
            on:recordAudio={() => {
              // TODO(DESK-196)
            }}
            on:sendTextMessage={handleSendTextMessage}
            on:sendMessage={(event) => {
              dispatch('sendMessage', event.detail);
              executeSendMessageSideEffects();
            }}
          />
        {:else}
          {unreachable($composeData)}
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
      'messages' minmax(0, 1fr)
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

    .quote {
      background-color: var(--cc-compose-area-quote-background-color);
      padding: rem(8px) rem(8px) rem(8px) rem(16px);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: rem(24px);

      .body {
        flex-grow: 1;
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
      position: relative;
      z-index: $z-index-zero;
    }

    .bottom-bar {
      grid-area: bottom-bar;
      position: relative;
      z-index: $z-index-zero;

      .disabled-input-area {
        text-align: center;
        margin: 1.5rem;
        opacity: 0.5;
        font-style: italic;
      }
    }
  }
</style>
