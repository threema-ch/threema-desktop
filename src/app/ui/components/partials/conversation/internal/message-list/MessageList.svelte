<!--
  @component
  Renders a conversation as a chat view.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import LazyList from '~/app/ui/components/hocs/lazy-list/LazyList.svelte';
  import type {LazyListProps} from '~/app/ui/components/hocs/lazy-list/props';
  import {Viewport} from '~/app/ui/components/partials/conversation/internal/message-list/helpers';
  import DeletedMessage from '~/app/ui/components/partials/conversation/internal/message-list/internal/deleted-message/DeletedMessage.svelte';
  import Message from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/Message.svelte';
  import MessageDetailsModal from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-details-modal/MessageDetailsModal.svelte';
  import MessageForwardModal from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-forward-modal/MessageForwardModal.svelte';
  import MessageMediaViewerModal from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/MessageMediaViewerModal.svelte';
  import StatusMessage from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/StatusMessage.svelte';
  import UnreadMessagesIndicator from '~/app/ui/components/partials/conversation/internal/message-list/internal/unread-messages-indicator/UnreadMessagesIndicator.svelte';
  import type {
    AnyMessageListMessage,
    MessageListProps,
    MessageListRegularMessage,
  } from '~/app/ui/components/partials/conversation/internal/message-list/props';
  import type {
    UnreadState,
    ModalState,
  } from '~/app/ui/components/partials/conversation/internal/message-list/types';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {appVisibility} from '~/common/dom/ui/state';
  import {MessageDirection} from '~/common/enum';
  import type {MessageId, StatusMessageId} from '~/common/network/types';
  import type {u53} from '~/common/types';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.message-list');

  type $$Props = MessageListProps;

  export let conversation: $$Props['conversation'];
  export let messagesStore: $$Props['messagesStore'];
  export let services: $$Props['services'];

  const dispatch = createEventDispatcher<{
    clickquote: MessageListRegularMessage;
    clickdelete: AnyMessageListMessage;
    clickedit: MessageListRegularMessage;
  }>();

  let element: HTMLElement;
  let lazyListComponent: SvelteNullableBinding<LazyList<AnyMessageListMessage>> = null;
  let viewport = new Viewport(
    log,
    conversation.setCurrentViewportMessages,
    conversation.initiallyVisibleMessageId ??
      conversation.firstUnreadMessageId ??
      conversation.lastMessage?.id,
  );

  /**
   * Because the read state of messages is immediately propagated to the frontend as soon as it
   * changes in the database, we need to keep the previous state to display visual cues to the user.
   */
  let rememberedUnreadState: UnreadState = {
    firstUnreadMessageId: undefined,
    hasIncomingUnreadMessages: false,
    hasOutgoingMessageChangesSinceOpened: false,
  };
  let modalState: ModalState = {type: 'none'};

  // Message that the chat view should be anchored to when it's (re-)initialized.
  let anchoredMessageId: MessageId | StatusMessageId | undefined =
    conversation.initiallyVisibleMessageId ??
    conversation.firstUnreadMessageId ??
    conversation.lastMessage?.id;

  // `MessageId` of the message that should be highlighted with an animation as soon as it becomes
  // visible (i.e., as soon as it was anchored).
  let messageToHighlightMessageId: MessageId | StatusMessageId | undefined;

  // `MessageId` of the message that should be highlighted.
  let highlightedMessageId: MessageId | StatusMessageId | undefined = undefined;

  let isScrollToBottomButtonVisible = false;

  /**
   * Updates only if the value of `conversation.id` changes, not on every change of the
   * `conversation` object.
   */
  let currentConversationId: $$Props['conversation']['id'] = conversation.id;
  $: if (currentConversationId !== conversation.id) {
    currentConversationId = conversation.id;
  }

  /**
   * Updates only if the value of `conversation.lastMessage.id` changes, not on every change of the
   * `conversation` object.
   */
  let currentLastMessage: $$Props['conversation']['lastMessage'] = conversation.lastMessage;
  $: if (currentLastMessage?.id !== conversation.lastMessage?.id) {
    currentLastMessage = conversation.lastMessage;
  }

  /**
   * Updates only if the value of `conversation.receiver` changes, not on every change of the
   * `conversation` object.
   */
  let currentConversationReceiver: $$Props['conversation']['receiver'] = conversation.receiver;
  $: if (
    currentConversationReceiver.lookup.uid !== conversation.receiver.lookup.uid ||
    currentConversationReceiver.lookup.type !== conversation.receiver.lookup.type
  ) {
    currentConversationReceiver = conversation.receiver;
  }

  /**
   * Scrolls the view to the message with the given id.
   */
  export async function scrollToMessage(
    id: AnyMessageListMessage['id'],
    options?: ScrollIntoViewOptions & {
      /** Whether to play an animation after scrolling to highlight the target element. */
      readonly highlightOnScrollEnd?: boolean;
    },
  ): Promise<void> {
    if (lazyListComponent === null) {
      return;
    }

    if (options?.highlightOnScrollEnd === true) {
      messageToHighlightMessageId = id;
    }

    // If the message is already loaded, scroll to it directly.
    if (messagesStore.get().find((message) => message.id === id)) {
      await lazyListComponent.scrollToItem(id, options);
      return;
    }

    // Else (i.e., if the message is not yet loaded), reinitialize the message list with the
    // respective message `id` as the initially visible message.
    reinitialize(id);
  }

  /**
   * Scrolls the view to the last (i.e. latest) message in the chat.
   */
  export async function scrollToLast(options?: ScrollIntoViewOptions): Promise<void> {
    if (conversation.lastMessage !== undefined) {
      await scrollToMessage(conversation.lastMessage.id, options);
    }
  }

  function handleClickScrollToBottom(): void {
    scrollToLast({
      behavior: 'smooth',
      block: 'end',
    }).catch(assertUnreachable);
  }

  function handleClickForwardOption(message: MessageListRegularMessage): void {
    modalState = {
      type: 'message-forward',
      props: {
        id: message.id,
        receiverLookup: conversation.receiver.lookup,
        services,
      },
    };
  }

  function handleClickOpenDetailsOption(message: AnyMessageListMessage): void {
    switch (message.type) {
      case 'deleted-message':
        modalState = {
          type: 'message-details',
          props: {
            conversation,
            direction: message.direction,
            history: [],
            id: message.id,
            reactions: [],
            services,
            status: message.status,
          },
        };
        break;

      case 'regular-message':
        modalState = {
          type: 'message-details',
          props: {
            conversation,
            direction: message.direction,
            file: message.file,
            history: message.history,
            id: message.id,
            reactions: message.reactions,
            services,
            status: message.status,
          },
        };
        break;

      case 'status-message':
        modalState = {
          type: 'message-details',
          props: {
            conversation,
            history: [],
            id: message.id,
            reactions: [],
            services,
            status: {created: message.created},
            statusMessageType: message.status.type,
          },
        };
        break;

      default:
        unreachable(message);
    }
  }

  function handleClickThumbnail(message: MessageListRegularMessage): void {
    if (message.file !== undefined) {
      switch (message.file.type) {
        case 'audio':
        case 'file':
          /*
           * When the file type is not `image` or `video`, there should be no thumbnail. The
           * `on:clickthumbnail` event should therefore never happen in this case.
           */
          log.error('Unexpected click on thumbnail when file was not an image or video');
          break;

        case 'image':
        case 'video':
          modalState = {
            type: 'message-media-viewer',
            props: {
              /*
               * TS doesn't manage to narrow the type, but we can be sure that the file type is
               * `image` or `video` at this point.
               */
              file: message.file as NonNullable<MessageListRegularMessage['file']> & {
                readonly type: 'image' | 'video';
              },
            },
          };
          break;

        default:
          unreachable(message.file.type);
      }
    } else {
      /*
       * When `file` is undefined, `thumbnail` is also undefined. The `on:clickthumbnail` event should
       * therefore never happen in this case.
       */
      log.error('Unexpected click on thumbnail when file was undefined');
    }
  }

  function handleClickQuote(message: MessageListRegularMessage): void {
    switch (message.quote) {
      case undefined:
      case 'not-found':
        log.error('Quote was clicked but it was either undefined or not found');
        return;

      default:
        scrollToMessage(message.quote.id, {
          behavior: 'smooth',
          block: 'start',
          highlightOnScrollEnd: true,
        }).catch(assertUnreachable);
    }
  }

  function handleCompleteHighlightAnimation(): void {
    messageToHighlightMessageId = undefined;
    highlightedMessageId = undefined;
  }

  function handleCloseModal(): void {
    // Reset modal state.
    modalState = {
      type: 'none',
    };
  }

  function handleChangeConversation(): void {
    reinitialize(
      conversation.initiallyVisibleMessageId ??
        conversation.firstUnreadMessageId ??
        conversation.lastMessage?.id,
    );
    refreshUnreadState();
    markConversationAsRead();
  }

  function handleChangeApplicationFocus(): void {
    if ($appVisibility === 'focused') {
      markConversationAsRead();
    }
  }

  /**
   * Should run when the conversation or the last message changes (or both). Note: As
   * `currentLastMessage` always changes as well if the conversation changes (because each
   * conversation has a different last message), this can't be separated.
   */
  function handleChangeConversationOrLastMessage(): void {
    if (currentLastMessage === undefined) {
      return;
    }

    const isOutbound = currentLastMessage.direction === MessageDirection.OUTBOUND;
    const hasOutgoingMessageChangesSinceOpened =
      rememberedUnreadState.hasOutgoingMessageChangesSinceOpened ? true : isOutbound;

    if ($appVisibility === 'focused') {
      /*
       * If app is focused, only update whether any outgoing messages have been sent since first
       * opening the conversation.
       */
      rememberedUnreadState = {
        ...rememberedUnreadState,
        hasOutgoingMessageChangesSinceOpened,
      };

      /*
       * Because the user seems to be monitoring the conversation actively, mark the conversation as
       * read immediately when a new message arrives and the app is `focused`.
       */
      markConversationAsRead();
    } else {
      /*
       * If app is in background, refresh the conversation state (i.e., get fresh unread info from
       * the back-end) to move the indicator to the right location.
       */
      refreshUnreadState();
    }

    // If the added message is outbound, bring it into view. However, if another message was already
    // explicitly marked to be anchored, don't override it.
    if (isOutbound && anchoredMessageId === undefined) {
      anchoredMessageId = currentLastMessage.id;
    }
  }

  function handleLazyListError(error: Error): void {
    log.error(`An error occurred in LazyList: ${error.message}`);
  }

  function handleItemAnchored(
    event: CustomEvent<LazyListProps<AnyMessageListMessage>['items'][u53]>,
  ): void {
    const messageId = event.detail.id;

    // If the `messageId` that was just anchored was marked for highlighting after animation, mark
    // it as highlighted.
    if (messageId === messageToHighlightMessageId) {
      highlightedMessageId = messageToHighlightMessageId;
    }

    // If the `messageId` that was just anchored was the `initiallyVisibleMessageId`, mark it as
    // highlighted.
    if (messageId === conversation.initiallyVisibleMessageId) {
      highlightedMessageId = conversation.initiallyVisibleMessageId;
    }

    // Reset `anchoredMessageId` so that the same message can be repeatedly anchored.
    anchoredMessageId = undefined;
  }

  function handleItemEntered(
    event: CustomEvent<LazyListProps<AnyMessageListMessage>['items'][u53]>,
  ): void {
    viewport.addMessage(event.detail.id);
  }

  function handleItemExited(
    event: CustomEvent<LazyListProps<AnyMessageListMessage>['items'][u53]>,
  ): void {
    viewport.deleteMessage(event.detail.id);
  }

  function handleScroll(event: CustomEvent<{distanceFromBottomPx: u53}>): void {
    if (event.detail.distanceFromBottomPx > 512) {
      isScrollToBottomButtonVisible = true;
    } else {
      isScrollToBottomButtonVisible = false;
    }
  }

  /**
   * Trigger a full refresh of the message list.
   */
  function reinitialize(initiallyVisibleMessageId?: MessageId | StatusMessageId): void {
    if (initiallyVisibleMessageId !== undefined) {
      anchoredMessageId = initiallyVisibleMessageId;
    }

    // Reinitializing `viewport` will result in the backend sending a new list of messages.
    viewport = new Viewport(
      log,
      conversation.setCurrentViewportMessages,
      initiallyVisibleMessageId,
    );
  }

  function refreshUnreadState(): void {
    rememberedUnreadState = {
      firstUnreadMessageId: conversation.firstUnreadMessageId,
      hasIncomingUnreadMessages: conversation.unreadMessagesCount > 0,
      hasOutgoingMessageChangesSinceOpened: false,
    };
  }

  /**
   * Mark all messages as read in the database. Note: This will be propagated back to the UI layer
   * as an update of `conversation`.
   */
  function markConversationAsRead(): void {
    conversation.markAllMessagesAsRead();
  }

  $: reactive(handleChangeConversation, [currentConversationId]);
  $: reactive(handleChangeApplicationFocus, [$appVisibility]);
  $: reactive(handleChangeConversationOrLastMessage, [currentConversationId, currentLastMessage]);
</script>

<div bind:this={element} class="chat">
  <button
    class="scroll-to-bottom"
    class:visible={isScrollToBottomButtonVisible}
    on:click={handleClickScrollToBottom}
  >
    <MdIcon theme="Outlined">arrow_downward</MdIcon>
  </button>

  {#if $messagesStore.length === 0}
    <div class="empty-chat">
      <div class="notice">
        <div class="icon"><MdIcon theme="Outlined">info</MdIcon></div>
        <div class="content">
          <SubstitutableText
            text={$i18n.t(
              'messaging.markup--chat-empty-state',
              'This chat is linked with your mobile device.<1/>All future messages will appear here.',
            )}
          >
            <br slot="1" />
          </SubstitutableText>
        </div>
      </div>
    </div>
  {:else}
    <LazyList
      bind:this={lazyListComponent}
      items={$messagesStore}
      onError={handleLazyListError}
      visibleItemId={anchoredMessageId}
      on:itemanchored={handleItemAnchored}
      on:itementered={handleItemEntered}
      on:itemexited={handleItemExited}
      on:scroll={handleScroll}
    >
      <div
        class={`message ${item.type === 'status-message' ? 'status' : item.direction}`}
        slot="item"
        let:item
      >
        <!-- Because the linter infers the wrong type for `item`, we have to disable
          `no-unsafe-argument` for this entire block, unfortunately. -->
        <!-- eslint-disable @typescript-eslint/no-unsafe-argument -->
        {#if item.type === 'regular-message' || item.type === 'deleted-message'}
          {#if item.id === rememberedUnreadState.firstUnreadMessageId}
            <div class="separator">
              <UnreadMessagesIndicator
                variant={rememberedUnreadState.hasOutgoingMessageChangesSinceOpened
                  ? 'hairline'
                  : 'new-messages'}
              />
            </div>
          {/if}

          {#if item.type === 'deleted-message'}
            <DeletedMessage
              boundary={element}
              {conversation}
              direction={item.direction}
              highlighted={item.id === highlightedMessageId}
              sender={item.sender}
              {services}
              status={item.status}
              on:clickdeleteoption={() => dispatch('clickdelete', item)}
              on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
              on:completehighlightanimation={handleCompleteHighlightAnimation}
            />
          {:else if item.type === 'regular-message'}
            <Message
              actions={item.actions}
              boundary={element}
              {conversation}
              direction={item.direction}
              file={item.file}
              highlighted={item.id === highlightedMessageId}
              id={item.id}
              quote={item.quote}
              reactions={item.reactions}
              sender={item.sender}
              {services}
              status={item.status}
              text={item.text}
              on:clickdeleteoption={() => dispatch('clickdelete', item)}
              on:clickeditoption={() => dispatch('clickedit', item)}
              on:clickforwardoption={() => handleClickForwardOption(item)}
              on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
              on:clickquote={() => handleClickQuote(item)}
              on:clickquoteoption={() => dispatch('clickquote', item)}
              on:clickthumbnail={() => handleClickThumbnail(item)}
              on:completehighlightanimation={handleCompleteHighlightAnimation}
            />
          {:else}
            {unreachable(item)}
          {/if}
        {:else if item.type === 'status-message'}
          <StatusMessage
            boundary={element}
            status={item.status}
            on:clickdeleteoption={() => dispatch('clickdelete', item)}
            on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
          />
        {:else}
          {unreachable(item)}
        {/if}
        <!-- eslint-enable @typescript-eslint/no-unsafe-argument -->
      </div>
    </LazyList>
  {/if}
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'message-details'}
  <MessageDetailsModal {...modalState.props} on:close={handleCloseModal} />
{:else if modalState.type === 'message-forward'}
  <MessageForwardModal {...modalState.props} on:close={handleCloseModal} />
{:else if modalState.type === 'message-media-viewer'}
  <MessageMediaViewerModal {...modalState.props} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .chat {
    position: relative;
    height: 100%;

    :global(> *) {
      height: 100%;
    }

    .scroll-to-bottom {
      --c-icon-font-size: #{rem(24px)};

      @include clicktarget-button-circle;
      @extend %elevation-060;
      z-index: $z-index-global-overlay;
      position: absolute;
      right: rem(8px);
      bottom: rem(12px);
      width: rem(40px);
      height: rem(40px);
      color: var(--cc-chat-scroll-to-bottom-button-color);
      background-color: var(--cc-chat-scroll-to-bottom-button-background-color);

      transition:
        opacity 0.05s linear,
        transform 0.1s ease-out;

      --c-icon-button-naked-outer-background-color--hover: var(
        --cc-chat-scroll-to-bottom-button-background-color--hover
      );
      --c-icon-button-naked-outer-background-color--focus: var(
        --cc-chat-scroll-to-bottom-button-background-color--focus
      );
      --c-icon-button-naked-outer-background-color--active: var(
        --cc-chat-scroll-to-bottom-button-background-color--active
      );

      &:not(.visible) {
        pointer-events: none;
        opacity: 0;
        transform: scale(0.75) translateY(rem(8px));
      }
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 0 rem(8px) rem(8px);

      :global(> .container) {
        max-width: min(rem(512px), 90%);
      }

      &.inbound {
        align-items: start;
        justify-content: center;
      }

      &.outbound {
        align-items: end;
        justify-content: center;
      }

      &.status {
        align-items: center;
        justify-content: center;

        :global(> .container) {
          max-width: min(rem(512px), 90%);
        }
      }

      .separator {
        padding: rem(8px) 0 rem(16px) 0;
        width: 100%;
      }
    }
  }

  .empty-chat {
    .notice {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--t-text-e2-color);
      // Adjust for top bar.
      margin: rem(16px + 64px) auto;
      user-select: none;

      .content {
        @extend %font-small-400;
      }

      .icon {
        margin-right: rem(8px);
        font-size: rem(16px);
      }
    }
  }
</style>
