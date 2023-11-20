<!--
  @component
  Renders a conversation as a chat view.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

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
    messageSetViewModelToMessagePropsStore,
  } from '~/app/ui/components/partials/chat-view/transformers';
  import type {UnreadState, ModalState} from '~/app/ui/components/partials/chat-view/types';
  import {i18n} from '~/app/ui/i18n';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbConversationUid, DbReceiverLookup} from '~/common/db';
  import {appVisibility} from '~/common/dom/ui/state';
  import {MessageDirection} from '~/common/enum';
  import type {MessageId} from '~/common/network/types';
  import {unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.chat-view');

  type $$Props = ChatViewProps;

  export let conversation: $$Props['conversation'];
  export let messageSetViewModel: $$Props['messageSetViewModel'];
  export let services: $$Props['services'];

  let element: HTMLElement;
  let lazyListComponent: SvelteNullableBinding<LazyList<MessageId, MessagePropsFromBackend>> = null;

  /**
   * If this value is set, then the chat will scroll to the specified message.
   */
  let initiallyVisibleMessageId: MessageId | undefined = conversation.firstUnreadMessageId;

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

  const dispatch = createEventDispatcher<{
    clickquote: MessagePropsFromBackend;
    clickdelete: MessagePropsFromBackend;
  }>();

  const viewport = new Viewport(log, messageSetViewModel.controller);

  /**
   * Scrolls the view to the message with the given id.
   */
  export function scrollToMessage(
    id: MessagePropsFromBackend['id'],
    behavior: ScrollBehavior,
  ): void {
    lazyListComponent?.scrollToItem(id, behavior);
  }

  /**
   * Scrolls the view to the last item. Note: This won't be the last item in the items list, but the
   * first item found with the `isLast` flag set to true. This means scrolling will only be executed
   * if a message exists that has the `isLast` flag set to `true`.
   */
  export function scrollToLast(behavior: ScrollBehavior): void {
    lazyListComponent?.scrollToLast(behavior);
  }

  function handleClickForwardOption(message: MessagePropsFromBackend): void {
    modalState = {
      type: 'message-forward',
      props: {
        id: message.id,
        receiverLookup: conversation.receiverLookup,
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

  function handleCloseModal(): void {
    // Reset modal state.
    modalState = {
      type: 'none',
    };
  }

  function handleChangeConversation(): void {
    initiallyVisibleMessageId = conversation.firstUnreadMessageId;
    rememberUnreadState();
    markConversationAsRead();
  }

  function handleChangeApplicationFocus(): void {
    if ($appVisibility === 'focused') {
      markConversationAsRead();
    }
  }

  function handleChangeLastMessage(): void {
    const hasOutgoingMessageChangesSinceOpened =
      rememberedUnreadState.hasOutgoingMessageChangesSinceOpened
        ? true
        : currentLastMessage?.direction === MessageDirection.OUTBOUND;

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
      rememberUnreadState();
    }
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

  function rememberUnreadState(): void {
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

  /**
   * Updates only if the value of `conversation.id` changes, not on every change of the
   * `conversation` object.
   */
  let currentConversationId: DbConversationUid;
  $: if (currentConversationId !== conversation.id) {
    currentConversationId = conversation.id;
  }

  /**
   * Updates only if the value of `conversation.receiverLookup` changes, not on every change of the
   * `conversation` object.
   */
  let currentConversationReceiver: DbReceiverLookup;
  $: if (currentConversationReceiver !== conversation.receiverLookup) {
    currentConversationReceiver = conversation.receiverLookup;
  }

  /**
   * Updates only if the value of `conversation.lastMessage.id` changes, not on every change of the
   * `conversation` object.
   */
  let currentLastMessage: $$Props['conversation']['lastMessage'];
  $: if (currentLastMessage?.id !== conversation.lastMessage?.id) {
    currentLastMessage = conversation.lastMessage;
  }

  $: messagePropsStore = messageSetViewModelToMessagePropsStore(
    messageSetViewModel,
    currentConversationReceiver,
    services,
  );

  $: reactive(handleChangeConversation, [currentConversationId]);
  $: reactive(handleChangeApplicationFocus, [$appVisibility]);
  $: reactive(handleChangeLastMessage, [currentLastMessage]);
</script>

<div bind:this={element} class="chat">
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
      lastItemId={currentLastMessage?.id}
      initiallyVisibleItemId={initiallyVisibleMessageId}
      on:itementered={handleItemEntered}
      on:itemexited={handleItemExited}
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
          {services}
          on:clickquoteoption={() => dispatch('clickquote', item)}
          on:clickforwardoption={() => handleClickForwardOption(item)}
          on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
          on:clickdeleteoption={() => dispatch('clickdelete', item)}
          on:clickthumbnail={() => handleClickThumbnail(item)}
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
    height: 100%;

    :global(> *) {
      height: 100%;
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
