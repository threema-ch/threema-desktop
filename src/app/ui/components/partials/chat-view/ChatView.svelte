<!--
  @component
  Renders a conversation as a chat view.
-->
<script lang="ts">
  import {createEventDispatcher, tick} from 'svelte';

  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import LazyList from '~/app/ui/components/hocs/lazy-list/LazyList.svelte';
  import type {LazyListItemProps} from '~/app/ui/components/hocs/lazy-list/props';
  import {Viewport} from '~/app/ui/components/partials/chat-view/helpers';
  import Message from '~/app/ui/components/partials/chat-view/internal/message/Message.svelte';
  import MessageDetailsModal from '~/app/ui/components/partials/chat-view/internal/message-details-modal/MessageDetailsModal.svelte';
  import MessageForwardModal from '~/app/ui/components/partials/chat-view/internal/message-forward-modal/MessageForwardModal.svelte';
  import MessageMediaViewerModal from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/MessageMediaViewerModal.svelte';
  import UnreadMessagesIndicator from '~/app/ui/components/partials/chat-view/internal/unread-messages-indicator/UnreadMessagesIndicator.svelte';
  import type {ChatViewProps} from '~/app/ui/components/partials/chat-view/props';
  import {
    type MessagePropsFromBackend,
    messageSetStoreToMessagePropsStore,
  } from '~/app/ui/components/partials/chat-view/transformers';
  import type {UnreadState, ModalState} from '~/app/ui/components/partials/chat-view/types';
  import {i18n} from '~/app/ui/i18n';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {appVisibility} from '~/common/dom/ui/state';
  import {MessageDirection} from '~/common/enum';
  import type {MessageId} from '~/common/network/types';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.chat-view');

  type $$Props = ChatViewProps;

  export let conversation: $$Props['conversation'];
  export let messageSetStore: $$Props['messageSetStore'];
  export let services: $$Props['services'];

  const dispatch = createEventDispatcher<{
    clickquote: MessagePropsFromBackend;
    clickdelete: MessagePropsFromBackend;
  }>();

  let element: HTMLElement;
  let lazyListComponent: SvelteNullableBinding<LazyList<MessageId, MessagePropsFromBackend>> = null;
  let viewport = new Viewport(
    log,
    conversation.setCurrentViewportMessages,
    conversation.firstUnreadMessageId,
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
  let anchoredMessageId: MessageId | undefined = conversation.firstUnreadMessageId;

  // `MessageId` of the quote that was last clicked.
  let lastClickedQuoteId: MessageId | undefined = undefined;

  // `MessageId` of the message that should be highlighted with an animation as soon as it becomes
  // visible.
  let highlightedMessageId: MessageId | undefined = undefined;

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
  $: if (currentConversationReceiver !== conversation.receiver) {
    currentConversationReceiver = conversation.receiver;
  }

  /**
   * Scrolls the view to the message with the given id.
   */
  export async function scrollToMessage(
    id: MessagePropsFromBackend['id'],
    options?: ScrollIntoViewOptions,
  ): Promise<void> {
    if (lazyListComponent === null) {
      return;
    }

    // If the message is already loaded, scroll to it directly.
    if (messagePropsStore.get().find((message) => message.id === id)) {
      await lazyListComponent.scrollToItem(id, options);
      return;
    }

    // If the message is not yet loaded, reinitialize the message list with the respective message
    // `id` as the initially visible message.
    await reinitialize(id);
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
    void scrollToLast({
      behavior: 'smooth',
      block: 'end',
    });
  }

  function handleClickForwardOption(message: MessagePropsFromBackend): void {
    modalState = {
      type: 'message-forward',
      props: {
        id: message.id,
        receiverLookup: conversation.receiver.lookup,
        services,
      },
    };
  }

  function handleClickOpenDetailsOption(message: MessagePropsFromBackend): void {
    modalState = {
      type: 'message-details',
      props: {
        direction: message.direction,
        file: message.file,
        id: message.id,
        reactions: message.reactions,
        services,
        status: message.status,
        conversation,
      },
    };
  }

  function handleClickThumbnail(message: MessagePropsFromBackend): void {
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
              file: message.file as NonNullable<MessagePropsFromBackend['file']> & {
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

  function handleClickQuote(message: MessagePropsFromBackend): void {
    switch (message.quote) {
      case undefined:
      case 'not-found':
        log.error('Quote was clicked but it was either undefined or not found');
        return;

      default:
        lastClickedQuoteId = message.quote.id;

        void scrollToMessage(message.quote.id, {
          behavior: 'smooth',
          block: 'start',
        });
    }
  }

  function handleCompleteHighlightAnimation(): void {
    lastClickedQuoteId = undefined;
    highlightedMessageId = undefined;
  }

  function handleCloseModal(): void {
    // Reset modal state.
    modalState = {
      type: 'none',
    };
  }

  function handleChangeConversation(): void {
    void reinitialize(conversation.firstUnreadMessageId);
    refreshUnreadState();
    markConversationAsRead();
  }

  function handleChangeApplicationFocus(): void {
    if ($appVisibility === 'focused') {
      markConversationAsRead();
    }
  }

  function handleChangeLastMessage(): void {
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

    // If the added message is outbound, bring it into view.
    if (isOutbound) {
      anchoredMessageId = currentLastMessage.id;
    }
  }

  function handleLazyListError(error: Error): void {
    log.error(`An error occurred in LazyList: ${error.message}`);
  }

  function handleItemAnchored(
    event: CustomEvent<LazyListItemProps<MessageId, MessagePropsFromBackend>>,
  ): void {
    const messageId: MessageId = event.detail.id;

    if (messageId === lastClickedQuoteId) {
      highlightedMessageId = messageId;
    }

    // Reset `anchoredMessageId` so that the same message can be repeatedly anchored.
    anchoredMessageId = undefined;
  }

  function handleItemEntered(
    event: CustomEvent<LazyListItemProps<MessageId, MessagePropsFromBackend>>,
  ): void {
    viewport.addMessage(event.detail.id);
  }

  function handleItemExited(
    event: CustomEvent<LazyListItemProps<MessageId, MessagePropsFromBackend>>,
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
  async function reinitialize(initiallyVisibleMessageId?: MessageId): Promise<void> {
    if (initiallyVisibleMessageId !== undefined) {
      anchoredMessageId = initiallyVisibleMessageId;
    }
    await tick();

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

  $: messagePropsStore = messageSetStoreToMessagePropsStore(messageSetStore);

  $: reactive(handleChangeConversation, [currentConversationId]);
  $: reactive(handleChangeApplicationFocus, [$appVisibility]);
  $: reactive(handleChangeLastMessage, [currentLastMessage]);
</script>

<div bind:this={element} class="chat">
  <button
    class="scroll-to-bottom"
    class:visible={isScrollToBottomButtonVisible}
    on:click={handleClickScrollToBottom}
  >
    <MdIcon theme="Outlined">arrow_downward</MdIcon>
  </button>

  {#if $messagePropsStore.length === 0}
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
      items={$messagePropsStore}
      onError={handleLazyListError}
      visibleItemId={anchoredMessageId}
      on:itemanchored={handleItemAnchored}
      on:itementered={handleItemEntered}
      on:itemexited={handleItemExited}
      on:scroll={handleScroll}
    >
      <div class={`message ${item.direction}`} slot="item" let:item>
        {#if item.id === rememberedUnreadState.firstUnreadMessageId}
          <div class="separator">
            <UnreadMessagesIndicator
              variant={rememberedUnreadState.hasOutgoingMessageChangesSinceOpened
                ? 'hairline'
                : 'new-messages'}
            />
          </div>
        {/if}

        <!-- eslint-disable @typescript-eslint/no-unsafe-argument -->
        <Message
          {...item}
          boundary={element}
          {conversation}
          highlighted={item.id === highlightedMessageId}
          {services}
          on:clickquoteoption={() => dispatch('clickquote', item)}
          on:clickforwardoption={() => handleClickForwardOption(item)}
          on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
          on:clickdeleteoption={() => dispatch('clickdelete', item)}
          on:clickthumbnail={() => handleClickThumbnail(item)}
          on:clickquote={() => handleClickQuote(item)}
          on:completehighlightanimation={handleCompleteHighlightAnimation}
        />
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
      margin: rem(16px) auto;
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
