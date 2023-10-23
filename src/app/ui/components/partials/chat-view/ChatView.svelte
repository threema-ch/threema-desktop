<!--
  @component
  Renders a conversation as a chat view.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import LazyList from '~/app/ui/components/organisms/lazy-list/LazyList.svelte';
  import type {LazyListItemProps} from '~/app/ui/components/organisms/lazy-list/props';
  import {
    type MessagePropsFromBackend,
    messageSetViewModelToMessagePropsStore,
  } from '~/app/ui/components/partials/chat-view/helpers';
  import Message from '~/app/ui/components/partials/chat-view/internal/message/Message.svelte';
  import MessageDetailsModal from '~/app/ui/components/partials/chat-view/internal/message-details-modal/MessageDetailsModal.svelte';
  import MessageForwardModal from '~/app/ui/components/partials/chat-view/internal/message-forward-modal/MessageForwardModal.svelte';
  import MessageMediaViewerModal from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/MessageMediaViewerModal.svelte';
  import type {ChatViewProps} from '~/app/ui/components/partials/chat-view/props';
  import type {ModalState} from '~/app/ui/components/partials/chat-view/types';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {MessageId} from '~/common/network/types';
  import {unreachable} from '~/common/utils/assert';
  import {AsyncLock} from '~/common/utils/lock';
  import {debounce} from '~/common/utils/timer';

  const log = globals.unwrap().uiLogging.logger('ui.component.chat-view');

  type $$Props = ChatViewProps;

  export let conversation: $$Props['conversation'];
  export let messageSetViewModel: $$Props['messageSetViewModel'];
  export let services: $$Props['services'];

  let element: HTMLElement;
  let lazyListComponent: SvelteNullableBinding<LazyList<MessageId, MessagePropsFromBackend>> = null;

  let modalState: ModalState = {type: 'none'};

  const dispatch = createEventDispatcher<{
    clickquote: MessagePropsFromBackend;
    clickdelete: MessagePropsFromBackend;
  }>();

  const viewport: {
    readonly lock: AsyncLock;
    readonly messages: Set<MessageId>;
    update: () => void;
  } = {
    lock: new AsyncLock(),
    messages: new Set(),
    update: debounce(
      () => {
        void viewport.lock.with(async () => {
          await messageSetViewModel.controller.setCurrentViewportMessages([...viewport.messages]);
        });
      },
      100,
      false,
    ),
  };

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

  function handleItemEntered(
    event: CustomEvent<LazyListItemProps<MessageId, MessagePropsFromBackend>>,
  ): void {
    updateViewportMessages({add: event.detail.id});
  }

  function handleItemExited(
    event: CustomEvent<LazyListItemProps<MessageId, MessagePropsFromBackend>>,
  ): void {
    updateViewportMessages({delete: event.detail.id});
  }

  function updateViewportMessages(update: {
    readonly add?: MessageId;
    readonly delete?: MessageId;
  }): void {
    if (update.add !== undefined) {
      viewport.messages.add(update.add);
    }
    if (update.delete !== undefined) {
      viewport.messages.delete(update.delete);
    }
    viewport.update();
  }

  $: messagePropsStore = messageSetViewModelToMessagePropsStore(messageSetViewModel);
</script>

<div bind:this={element} class="chat">
  <LazyList
    bind:this={lazyListComponent}
    items={$messagePropsStore}
    lastItemId={conversation.lastMessageId}
    on:itementered={handleItemEntered}
    on:itemexited={handleItemExited}
  >
    <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -->
    <div class={`message ${item.direction}`} slot="item" let:item>
      <!-- eslint-disable @typescript-eslint/no-unsafe-argument -->
      <Message
        {...item}
        boundary={element}
        {conversation}
        on:clickquoteoption={() => dispatch('clickquote', item)}
        on:clickforwardoption={() => handleClickForwardOption(item)}
        on:clickopendetailsoption={() => handleClickOpenDetailsOption(item)}
        on:clickdeleteoption={() => dispatch('clickdelete', item)}
        on:clickthumbnail={() => handleClickThumbnail(item)}
      />
      <!-- eslint-enable @typescript-eslint/no-unsafe-argument -->
    </div>
  </LazyList>
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
      width: 100%;
      padding: 0 rem(8px) rem(8px);

      :global(> *) {
        max-width: min(rem(512px), 90%);
      }

      &.inbound {
        align-items: center;
        justify-content: start;
      }

      &.outbound {
        align-items: center;
        justify-content: end;
      }
    }
  }
</style>
