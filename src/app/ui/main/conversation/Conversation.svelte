<script lang="ts">
  import {createEventDispatcher, onDestroy} from 'svelte';
  import {type Writable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type FileResult} from '#3sc/utils/filelist';
  import {globals} from '~/app/globals';
  import {type ForwardedMessageLookup, ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices, type SvelteAction} from '~/app/types';
  import {isDisabledReceiver, isInactiveContact} from '~/app/ui/generic/receiver';
  import {i18n} from '~/app/ui/i18n';
  import {conversationDrafts, conversationListEvent} from '~/app/ui/main/conversation';
  import {type ComposeData} from '~/app/ui/main/conversation/compose';
  import ComposeHandler from '~/app/ui/main/conversation/compose/ComposeHandler.svelte';
  import ConversationMessageList from '~/app/ui/main/conversation/conversation-messages/ConversationMessageList.svelte';
  import MessageBody from '~/app/ui/main/conversation/conversation-messages/MessageBody.svelte';
  import ConversationTopBar from '~/app/ui/main/conversation/top-bar/ConversationTopBar.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type DbReceiverLookup} from '~/common/db';
  import {display, layout} from '~/common/dom/ui/state';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ConversationCategory, ReceiverType} from '~/common/enum';
  import {type AnyReceiverStore, type Conversation} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type MessageId} from '~/common/network/types';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {WritableStore} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import {
    type ConversationViewModel,
    type InnerConversationViewModelStore,
    type SendMessageEventDetail,
  } from '~/common/viewmodel/conversation';
  import {type ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation');

  /**
   * App services.
   */
  export let services: AppServices;
  const {backend, router} = services;

  export let receiverLookup: DbReceiverLookup;

  export let forwardedMessageLookup: ForwardedMessageLookup | undefined;

  $: if (forwardedMessageLookup !== undefined) {
    void insertForwardedMessage(forwardedMessageLookup);
  }

  /**
   * The Conversation ViewModel.
   */
  export let conversationViewModel: Remote<ConversationViewModel>;

  /**
   * The conversation model store.
   */
  let conversation: RemoteModelStore<Conversation> = conversationViewModel.conversation;
  $: conversation = conversationViewModel.conversation;

  let receiver: Remote<AnyReceiverStore> = conversationViewModel.receiver;
  $: receiver = conversationViewModel.receiver;

  $: isReceiverBlockedStore = derive(
    conversationViewModel.viewModel,
    (viewModel) => viewModel.receiver.type === 'contact' && viewModel.receiver.isBlocked,
  );

  let innerConversationViewModel: Remote<InnerConversationViewModelStore> =
    conversationViewModel.viewModel;
  $: innerConversationViewModel = conversationViewModel.viewModel;

  let composeHandler: ComposeHandler;

  /**
   * Whether the Media Message Dialog is visible or not
   */
  export let mediaMessageDialogVisible: boolean;

  /**
   * Open the media compose message dialog if accessible files have been dropped
   */
  export function handleFileDrop(fileResult: FileResult): void {
    composeHandler.handleFileDrop(fileResult);
  }

  /**
   * Component event dispatcher
   */
  const dispatch = createEventDispatcher<{sendMessage: SendMessageEventDetail}>();

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
      composeHandler.clearText();
      composeHandler.insertText(forwardedMessage.view.text);
    }
  }

  /**
   * Send a text message.
   */
  function sendTextMessage(ev: CustomEvent<string>): void {
    const text = ev.detail;
    const quotedMessageId =
      $composeData.mode === 'quote' ? $composeData.quotedMessageViewModelBundle.id : undefined;

    // Do not send empty messages
    if (text.trim() === '') {
      return;
    }
    dispatch('sendMessage', {
      type: 'text',
      text,
      quotedMessageId,
    });

    // Clear draft and compose data
    conversationDraftStore.set(undefined);
    composeData.set(getDefaultComposeData(undefined));

    sendMessageActions(ev);
  }

  /**
   * Actions which should be executed when a message is being sent.
   */
  function sendMessageActions(_: CustomEvent): void {
    // Set Nav to Conversation Preview List
    if ($router.nav?.id !== 'conversationList') {
      router.replaceNav(ROUTE_DEFINITIONS.nav.conversationList.withoutParams());
    }

    // Dispatch an event to scroll the conversation list all the way to the top
    conversationListEvent.post({action: 'scroll-to-top'});

    // Scroll to the bottom of the conversation
    anchorActive = true;
  }

  let conversationDraftStore = conversationDrafts.getOrCreateStore(receiverLookup);

  // Compose mode and data
  //
  // TODO(DESK-306): If a draft is available for the current receiver, initialize it here (set the
  // text appropriately).
  const composeData: Writable<ComposeData> = new WritableStore(
    getDefaultComposeData($conversationDraftStore),
  );

  function getDefaultComposeData(text: string | undefined): ComposeData {
    return {
      mode: 'text',
      text,
      attachment: undefined,
      quotedMessageViewModelBundle: undefined,
    };
  }

  type ComposeDataUpdate =
    | {
        readonly mode: 'quote';
        readonly quotedMessageViewModelBundle: Remote<ConversationMessageViewModelBundle>;
      }
    | {
        readonly mode: 'text';
        readonly text?: string;
      };
  function updateComposeData(update: ComposeDataUpdate): void {
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
            quotedMessageViewModelBundle: undefined,
            text: update.text ?? currentData.text,
          } as const;
          break;
        default:
          unreachable(update);
      }
      return newData;
    });
  }

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

  /**
   * Save the message draft for the specified receiver and clear the compose area.
   */
  function saveMessageDraftAndClear(draftReceiverLookup: DbReceiverLookup): void {
    conversationDraftStore = conversationDrafts.getOrCreateStore(draftReceiverLookup);
    // Compose area does not exist on detail view in <large mode,
    // or, when an inactive group is displayed
    if (!isComposeHandler(composeHandler)) {
      return;
    }

    // Save current message draft
    const currentDraft = composeHandler.getText();
    conversationDraftStore.set(currentDraft?.trim() === '' ? undefined : currentDraft);
    composeHandler.clearText();
  }

  // Detect route changes
  let lastReceiverLookup = receiverLookup;

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

  /**
   * Set a message as the current quote
   */
  function quoteMessage(event: CustomEvent<Remote<ConversationMessageViewModelBundle>>): void {
    updateComposeData({
      mode: 'quote',
      quotedMessageViewModelBundle: event.detail,
    });
    composeHandler.focus();
  }

  /**
   * Remove the current quote
   */
  function removeQuote(_: MouseEvent): void {
    updateComposeData({mode: 'text'});
    composeHandler.focus();
  }

  /**
   * Delete a message and remove it from being quoted (in case it is)
   */
  function deleteMessage(event: CustomEvent<MessageId>): void {
    const messageId = event.detail;

    if (
      $composeData.mode === 'quote' &&
      $composeData.quotedMessageViewModelBundle.id === messageId
    ) {
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

  // eslint-disable-next-line @typescript-eslint/ban-types
  let messagesContainer: HTMLElement | null = null;

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
      <div bind:this={messagesContainer} class="messages">
        {#await conversationViewModel.viewModelController.getConversationMessagesSetStore() then conversationMessagesSet}
          <ConversationMessageList
            {conversationMessagesSet}
            {receiverLookup}
            {receiver}
            {conversation}
            {services}
            isReceiverBlocked={$isReceiverBlockedStore}
            container={messagesContainer}
            on:quoteMessage={quoteMessage}
            on:deleteMessage={deleteMessage}
          />
        {/await}
        <div class="anchor" class:active={anchorActive} use:scrollSnap />
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
        {:else if $composeData.mode === 'text' || $composeData.mode === 'quote'}
          {#if $composeData.mode === 'quote'}
            <div class="quote">
              {#key $composeData.quotedMessageViewModelBundle}
                <div class="body">
                  <MessageBody
                    viewModelBundle={$composeData.quotedMessageViewModelBundle}
                    {receiver}
                    isQuoted={true}
                  />
                </div>
              {/key}
              <IconButton flavor="naked" on:click={removeQuote}>
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
            on:sendTextMessage={sendTextMessage}
            on:sendMessage={(event) => {
              dispatch('sendMessage', event.detail);
              sendMessageActions(event);
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

      .disabled-input-area {
        text-align: center;
        margin: 1.5rem;
        opacity: 0.5;
        font-style: italic;
      }
    }
  }
</style>
