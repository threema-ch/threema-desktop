<!--
  @component Renders a conversation as a chat view.
-->
<script lang="ts">
  import {createEventDispatcher, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {clickoutside} from '~/app/ui/actions/clickoutside';
  import LazyList from '~/app/ui/components/hocs/lazy-list/LazyList.svelte';
  import type {LazyListProps} from '~/app/ui/components/hocs/lazy-list/props';
  import EmojiPicker from '~/app/ui/components/molecules/emoji-picker/EmojiPicker.svelte';
  import {
    hasOutboundEmojiReaction,
    Viewport,
  } from '~/app/ui/components/partials/conversation/internal/message-list/helpers';
  import DeletedMessage from '~/app/ui/components/partials/conversation/internal/message-list/internal/deleted-message/DeletedMessage.svelte';
  import MessageDetailsModal from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-details-modal/MessageDetailsModal.svelte';
  import MessageForwardModal from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-forward-modal/MessageForwardModal.svelte';
  import MessageMediaViewerModal from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/MessageMediaViewerModal.svelte';
  import Message from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/RegularMessage.svelte';
  import StatusMessage from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/StatusMessage.svelte';
  import TypingIndicator from '~/app/ui/components/partials/conversation/internal/message-list/internal/typing-indicator/TypingIndicator.svelte';
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
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {scale} from '~/app/ui/transitions/scale';
  import {nodeIsOrContainsTarget} from '~/app/ui/utils/node';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {appVisibility} from '~/common/dom/ui/state';
  import {MessageDirection} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import type {MessageId, StatusMessageId} from '~/common/network/types';
  import type {u53} from '~/common/types';
  import {assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
  import {
    isSingleUnicodeEmoji,
    THUMBS_DOWN_EMOJIS,
    THUMBS_UP_EMOJIS,
    type SingleUnicodeEmoji,
    type UnsupportedEmoji,
  } from '~/common/utils/emoji';

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

  let emojiPickerContainerElement: SvelteNullableBinding<HTMLDivElement> = null;
  let emojiPickerComponent: SvelteNullableBinding<EmojiPicker> = null;
  // The `MessageId` of the message where the emoji picker is currently attached to.
  let currentEmojiPickerState:
    | {
        readonly messageId: MessageId;
        readonly positionAnchor: `--${string}`;
        readonly onSelectEmoji: (emoji: SingleUnicodeEmoji) => void;
      }
    | undefined = undefined;

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
    if (messagesStore.get().find((message) => message.id === id) !== undefined) {
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
            direction: message.direction,
            history: [],
            id: message.id,
            services,
            status: message.status,
          },
        };
        break;

      case 'regular-message':
        modalState = {
          type: 'message-details',
          props: {
            direction: message.direction,
            file: message.file,
            history: message.history,
            id: message.id,
            services,
            status: message.status,
          },
        };
        break;

      case 'status-message':
        modalState = {
          type: 'message-details',
          props: {
            history: [],
            id: message.id,
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

  function handleClickOpenEmojiPicker(
    event: MouseEvent,
    messageId: MessageId,
    anchorName: `--${string}`,
    onSelectEmoji: (emoji: SingleUnicodeEmoji) => void,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    if (!conversation.emojiReactionsFeatureSupport.supported) {
      showEmojiReactionsNotSupportedToastFor(conversation.receiver.type);
      return;
    }
    // If the emoji picker is already open for the same `messageId`, treat this as a close request.
    if (currentEmojiPickerState?.messageId === messageId) {
      closeEmojiPicker();
      return;
    }
    // Close current emoji picker if it's already open to clear the state.
    if (currentEmojiPickerState !== undefined) {
      closeEmojiPicker();
    }

    openEmojiPicker(messageId, anchorName, onSelectEmoji).catch(assertUnreachable);
  }

  function handleSelectEmoji(emoji: SingleUnicodeEmoji): void {
    currentEmojiPickerState?.onSelectEmoji(emoji);
    closeEmojiPicker();
  }

  function handleClickOutsideEmojiPicker(event: MouseEvent): void {
    if (!nodeIsOrContainsTarget(emojiPickerContainerElement, event.target)) {
      closeEmojiPicker();
    }
  }

  async function openEmojiPicker(
    messageId: MessageId,
    anchorName: `--${string}`,
    onSelectEmoji: (emoji: SingleUnicodeEmoji) => void,
  ): Promise<void> {
    currentEmojiPickerState = {
      messageId,
      positionAnchor: anchorName,
      onSelectEmoji,
    };

    await tick();
    emojiPickerComponent?.focusSearchBar();
  }

  function showEmojiReactionsNotSupportedToastFor(
    receiverType: typeof conversation.receiver.type,
  ): void {
    switch (receiverType) {
      case 'contact':
        toast.addSimpleFailure(
          $i18n.t(
            'messaging.prose--emoji-reaction-not-supported',
            'Cannot add an emoji reaction to the message because the recipient’s app version does not support this feature.',
          ),
        );
        break;

      case 'distribution-list':
        // TODO(DESK-236): Implement distribution lists.
        break;

      case 'group':
        toast.addSimpleFailure(
          $i18n.t(
            'messaging.prose--emoji-reaction-not-supported-group',
            'Cannot add an emoji reaction to the message because no group member supports this feature.',
          ),
        );
        break;

      default:
        unreachable(receiverType);
    }
  }

  /**
   * Checks whether (and which) emoji reactions are allowed to be applied, and calls the respective
   * handler action function if that's the case.
   *
   * @param emoji The emoji to apply as an emoji reaction.
   * @param actions The handlers that actually apply the reaction.
   */
  function validateAndApplyLegacyOrEmojiReaction(
    emoji: SingleUnicodeEmoji | UnsupportedEmoji,
    message: MessageListRegularMessage,
    actions: Pick<
      MessageListRegularMessage['actions'],
      'acknowledge' | 'applyEmojiReaction' | 'decline' | 'withdrawEmojiReaction'
    >,
  ): void {
    // Return early if the emoji is not supported / is unknown.
    if (!isSingleUnicodeEmoji(emoji)) {
      toast.addSimpleFailure(
        i18n
          .get()
          .t(
            'messaging.error--reaction-unsupported-emoji',
            'Could not react to message using an unsupported emoji',
          ),
      );
      return;
    }

    const intent = hasOutboundEmojiReaction(emoji, message.emojiReactions) ? 'withdraw' : 'apply';
    // If the recipient does not support emoji reactions, withdrawing is not allowed.
    if (!conversation.emojiReactionsFeatureSupport.supported && intent === 'withdraw') {
      toast.addSimpleFailure(
        i18n
          .get()
          .t(
            'messaging.error--reaction-withdrawal-disallowed',
            'The recipient does not yet support removing emoji reactions. You can still replace 👍 with 👎 or vice versa.',
          ),
      );

      return;
    }

    // If the conversation doesn't support emoji reactions yet, apply legacy reaction if possible.
    if (!conversation.emojiReactionsFeatureSupport.supported) {
      if (THUMBS_DOWN_EMOJIS.has(emoji)) {
        actions.decline().catch((error: unknown) => {
          log.error(
            `Could not apply legacy decline reaction to message: ${extractErrorMessage(ensureError(error), 'short')}`,
          );

          toast.addSimpleFailure(
            i18n.get().t('messaging.error--reaction', 'Could not react to message'),
          );
        });
        return;
      }
      if (THUMBS_UP_EMOJIS.has(emoji)) {
        actions.acknowledge().catch((error: unknown) => {
          log.error(
            `Could not apply legacy acknowledge reaction to message: ${extractErrorMessage(ensureError(error), 'short')}`,
          );

          toast.addSimpleFailure(i18n.get().t('messaging.error--reaction'));
        });
        return;
      }

      // Only thumbs-up or -down is allowed as a reaction in chats that don't support emoji
      // reactions, so we show a toast for all other emojis and send nothing.
      showEmojiReactionsNotSupportedToastFor(conversation.receiver.type);
      return;
    }

    // At this point we're sure that the conversation supports emoji reactions and the reaction is
    // valid. Display a warning toast to display the users that don't support the feature yet, and
    // apply the reaction.
    if (
      conversation.receiver.type === 'group' &&
      conversation.emojiReactionsFeatureSupport.notSupportedNames.length > 0 &&
      // Thumbs-up and -down emojis are excempted, because every version supports these.
      !THUMBS_DOWN_EMOJIS.has(emoji) &&
      !THUMBS_UP_EMOJIS.has(emoji)
    ) {
      const numNotSupported = conversation.emojiReactionsFeatureSupport.notSupportedNames.length;
      toast.addSimpleWarning(
        $i18n.t(
          'messaging.prose--emoji-reaction-not-supported-partial',
          'The following group members will not be able to see your reactions: {names}{n, plural, =0 {.} other { and {n} more.}} To see reactions, they need to install the latest {shortAppName} version.',
          {
            names: conversation.emojiReactionsFeatureSupport.notSupportedNames
              .slice(0, 5)
              .join(', '),
            n: `${numNotSupported > 5 ? numNotSupported - 5 : 0}`,
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        ),
      );
    }
    switch (intent) {
      case 'withdraw':
        actions.withdrawEmojiReaction(emoji).catch((error: unknown) => {
          log.error(
            `Error withdrawing emoji reaction: ${extractErrorMessage(ensureError(error), 'short')}`,
          );

          toast.addSimpleFailure(i18n.get().t('messaging.error--reaction'));
        });
        break;

      case 'apply':
        actions.applyEmojiReaction(emoji).catch((error: unknown) => {
          log.error(
            `Error applying emoji reaction: ${extractErrorMessage(ensureError(error), 'short')}`,
          );

          toast.addSimpleFailure(i18n.get().t('messaging.error--reaction'));
        });
        break;

      default:
        unreachable(intent);
    }
  }

  function closeEmojiPicker(): void {
    currentEmojiPickerState = undefined;

    emojiPickerComponent?.clearSearchTerm();
    emojiPickerComponent?.blurSearchBar();
    emojiPickerComponent?.scrollTo({behavior: 'instant', top: 0});
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

  function getHighlightedEmojis(
    currentEmojiPickerState_: typeof currentEmojiPickerState,
  ): SingleUnicodeEmoji[] {
    const currentMessage = $messagesStore.find(
      (message) => message.id === currentEmojiPickerState_?.messageId,
    );
    if (currentMessage?.type === 'regular-message') {
      return currentMessage.emojiReactions
        .filter((reaction) => reaction.sender.type === 'self')
        .map((reaction) => reaction.emoji)
        .filter(isSingleUnicodeEmoji);
    }
    return [];
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
      visibleItemId={anchoredMessageId}
      on:itemanchored={handleItemAnchored}
      on:itementered={handleItemEntered}
      on:itemexited={handleItemExited}
      on:scroll={handleScroll}
    >
      <div
        slot="before"
        bind:this={emojiPickerContainerElement}
        use:clickoutside={{enabled: currentEmojiPickerState !== undefined}}
        class="emoji-picker"
        class:visible={currentEmojiPickerState !== undefined}
        style:position-anchor={currentEmojiPickerState?.positionAnchor}
        on:clickoutside={({detail: {event}}) => {
          handleClickOutsideEmojiPicker(event);
        }}
      >
        <EmojiPicker
          bind:this={emojiPickerComponent}
          id="emoji-reactions-strip"
          {services}
          onSelectEmoji={handleSelectEmoji}
          highlighted={getHighlightedEmojis(currentEmojiPickerState)}
        />
      </div>

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
              id={item.id}
              sender={item.sender}
              {services}
              status={item.status}
              on:clickdeleteoption={() => dispatch('clickdelete', item)}
              on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
              on:completehighlightanimation={handleCompleteHighlightAnimation}
            />
          {:else if item.type === 'regular-message'}
            <Message
              boundary={element}
              {conversation}
              direction={item.direction}
              emojiReactions={item.emojiReactions}
              file={item.file}
              highlighted={item.id === highlightedMessageId}
              id={item.id}
              onClickContextMenuFavoriteEmoji={(event, emoji) => {
                validateAndApplyLegacyOrEmojiReaction(emoji, item, {
                  acknowledge: item.actions.acknowledge,
                  applyEmojiReaction: item.actions.applyEmojiReaction,
                  decline: item.actions.decline,
                  withdrawEmojiReaction: item.actions.withdrawEmojiReaction,
                });
              }}
              onClickEmojiReactionStripBucket={(event, emoji) => {
                validateAndApplyLegacyOrEmojiReaction(emoji, item, {
                  acknowledge: item.actions.acknowledge,
                  applyEmojiReaction: item.actions.applyEmojiReaction,
                  decline: item.actions.decline,
                  withdrawEmojiReaction: item.actions.withdrawEmojiReaction,
                });
              }}
              onClickOpenEmojiPicker={(event, anchorName) => {
                handleClickOpenEmojiPicker(event, item.id, anchorName, (emoji) => {
                  validateAndApplyLegacyOrEmojiReaction(emoji, item, {
                    // Note: Legacy acknowledge and decline is not really possible in the case of
                    // the emoji picker, because the picker will not be displayed in legacy chats.
                    // However, we pass the handlers in anyway, just in case.
                    acknowledge: item.actions.acknowledge,
                    applyEmojiReaction: item.actions.applyEmojiReaction,
                    decline: item.actions.decline,
                    withdrawEmojiReaction: item.actions.withdrawEmojiReaction,
                  });
                });
              }}
              options={{
                alwaysShowCaret: currentEmojiPickerState?.messageId === item.id,
              }}
              quote={item.quote}
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

      <div slot="after">
        {#if conversation.isTyping}
          <div class="typing-indicator" in:scale out:scale>
            <TypingIndicator />
          </div>
        {/if}
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
    overflow: clip;

    :global(> *) {
      height: 100%;
    }

    .scroll-to-bottom {
      --c-icon-font-size: #{rem(24px)};

      --c-icon-button-naked-outer-background-color--hover: var(
        --cc-chat-scroll-to-bottom-button-background-color--hover
      );
      --c-icon-button-naked-outer-background-color--focus: var(
        --cc-chat-scroll-to-bottom-button-background-color--focus
      );
      --c-icon-button-naked-outer-background-color--active: var(
        --cc-chat-scroll-to-bottom-button-background-color--active
      );

      @include clicktarget-button-circle;

      & {
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
      }

      &:not(.visible) {
        pointer-events: none;
        opacity: 0;
        transform: scale(0.75) translateY(rem(8px));
      }
    }

    .emoji-picker {
      visibility: hidden;
      z-index: $z-index-modal;

      position: absolute;
      position-area: bottom span-left;
      position-try-fallbacks:
        top span-left,
        bottom span-right,
        top span-right;
      margin: rem(4px) 0;

      height: rem(300px);
      width: rem(280px);
      padding: rem(12px) rem(12px) rem(0px);
      background-color: var(--cc-emoji-picker-popover-background-color);
      backdrop-filter: blur(25px);
      border-radius: rem(8px);
      box-shadow: var(--cc-emoji-picker-popover-box-shadow--visible);

      &.visible {
        visibility: visible;
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

    .typing-indicator {
      padding: 0 rem(8px) rem(8px);

      transform-origin: bottom left;
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
