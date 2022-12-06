<script lang="ts">
  import {markify, TokenType} from '@threema/threema-markup';
  import Autolinker from 'autolinker';
  import {onDestroy, onMount} from 'svelte';

  import Checkbox from '#3sc/components/blocks/Checkbox/Checkbox.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import AvatarComponent from '#3sc/components/threema/Avatar/Avatar.svelte';
  import FileMessage from '#3sc/components/threema/FileMessage/FileMessage.svelte';
  import MessageOverlay from '#3sc/components/threema/MessageOverlay/MessageOverlay.svelte';
  import {escapeHtmlUnsafeChars} from '#3sc/components/threema/Text';
  import TextMessage from '#3sc/components/threema/TextMessage/TextMessage.svelte';
  import UnsupportedMessage from '#3sc/components/threema/UnsupportedMessage/UnsupportedMessage.svelte';
  import {
    type AnyReceiverData as AnyReceiverData3SC,
    type ReceiverData as ReceiverData3SC,
  } from '#3sc/types';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import ContextMenu from '~/app/ui/main/conversation/ConversationMessages/ConversationMessageContextMenu.svelte';
  import {type ConversationData} from '~/app/ui/main/conversation';
  import MessageDelete from '~/app/ui/modal/MessageDelete.svelte';
  import MessageDetail from '~/app/ui/modal/MessageDetail.svelte';
  import MessageForward from '~/app/ui/modal/MessageForward.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {type DbReceiverLookup} from '~/common/db';
  import {MessageDirection, MessageReaction, ReceiverType} from '~/common/enum';
  import {
    type AnyMessageModelStore,
    type Conversation,
    type RemoteModelStoreFor,
  } from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type ReadonlyUint8Array} from '~/common/types';
  import {assert, assertUnreachable} from '~/common/utils/assert';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {eternalPromise} from '~/common/utils/promise';
  import {type RemoteStore} from '~/common/utils/store';
  import {type ConversationMessage, type Mention} from '~/common/viewmodel/conversation-messages';
  import {
    type AnyMessageBody,
    type AnyReceiverData,
    type Message,
    type MessageBodyFor,
    type ReceiverData,
  } from '~/common/viewmodel/types';

  /**
   * Receiver data.
   */
  export let receiver: ConversationData['receiver'];
  /**
   * Current receiver lookup
   */
  export let receiverLookup: DbReceiverLookup;
  /**
   * The parent conversation, to which this message belongs.
   */
  export let conversation: RemoteModelStore<Conversation>;
  /**
   * The intersection observer to detect ui read of messages.
   */
  export let readObserver: IntersectionObserver;
  /**
   * Determine whether the message is currently selectable via displayed checkbox.
   */
  export let selectable = true;
  /**
   * Determine whether the message is currently selected.
   */
  export let selected = false;
  /**
   * App services.
   */
  export let services: AppServices;
  const {router} = services;

  /**
   * The ConversationMessage ViewModel
   */
  export let viewModelStore: RemoteStore<RemoteObject<ConversationMessage>>;

  /**
   * The ModelStore for the Message
   */
  export let messageStore: RemoteModelStoreFor<AnyMessageModelStore>;

  let messageBody: Message<AnyMessageBody> = $viewModelStore.body;
  $: messageBody = $viewModelStore.body;

  // TODO(WEBMD-145): Rewrite this properly with UI template
  let messageBodyText: MessageBodyFor<'text'>;
  $: if (messageBody.type === 'text') {
    const quote = $viewModelStore.quote;
    if (quote === undefined) {
      messageBodyText = {text: messageBody.body.text};
    } else if (quote === 'not-found') {
      messageBodyText = {
        text: `_Quoted message not found_\n\n${messageBody.body.text}`,
      };
    } else {
      const quoteStore = quote.get();
      assert(quoteStore.body.type === 'text');

      const senderName =
        quoteStore.body.direction === 'incoming' ? quoteStore.body.sender.name : 'me';

      messageBodyText = {
        text: `--- 🗨️ Quote from ${senderName} ---\n${quoteStore.body.body.text}\n------\n\n${messageBody.body.text}`,
      };
    }
  }

  // Context menu
  let contextMenu: ContextMenu;
  let contextMenuPosition = {x: 0, y: 0};
  let isContextMenuVisible = false;
  function closeContextMenu(): void {
    contextMenu.close();
    isContextMenuVisible = false;
  }

  let isDeleteMessageConfirmationModalVisible = false;
  let isForwardMessageModalVisible = false;
  let isMessageDetailModalVisible = false;

  let messageContainer: HTMLDivElement;

  function openContextMenuOnMouseEvent(event: MouseEvent): void {
    if (selectable) {
      return;
    }

    if (event.type === 'contextmenu') {
      // Prevent browser context menu - do show only our own
      event.preventDefault();
    } else if (event.type === 'click') {
      // Prevent click trigger on body, which would close the contextmenu instantly
      event.stopPropagation();
    }

    contextMenuPosition = {x: event.clientX, y: event.clientY};
    contextMenu.open();
    isContextMenuVisible = true;
  }

  function copyMessageContent(): void {
    switch (messageBody.type) {
      case 'text':
        navigator.clipboard
          .writeText(messageBody.body.text)
          .then(() => toast.addSimpleSuccess('Message content copied to clipboard'))
          .catch(() => toast.addSimpleFailure('Could not copy message content to clipboard'));
        break;
      default:
        assertUnreachable(`unhandled message type ${messageBody.type}`);
    }
    closeContextMenu();
  }

  function showDeleteMessageConfirmationModal(): void {
    closeContextMenu();
    isDeleteMessageConfirmationModalVisible = true;
  }

  function showForwardMessageModal(): void {
    closeContextMenu();
    isForwardMessageModalVisible = true;
  }

  function showMessageDetails(): void {
    closeContextMenu();
    isMessageDetailModalVisible = true;
  }

  function deleteMessage(): void {
    // Todo(WEBMD-483): handle error
    conversation
      .get()
      .controller.removeMessage.fromLocal($messageStore.view.id)
      .catch(() => toast.addSimpleFailure('Could not delete message'));
    isDeleteMessageConfirmationModalVisible = false;
  }

  function reactToMessage(reaction: MessageReaction): void {
    if ($messageStore.ctx === MessageDirection.INBOUND) {
      // Todo(WEBMD-483): handle error
      $messageStore.controller.reaction
        .fromLocal(reaction, new Date())
        .catch(() => toast.addSimpleFailure('Could not react to message'));
    }
    closeContextMenu();
  }

  function clickoutsideContextMenu(): void {
    closeContextMenu();
  }

  function toggleSelect(): void {
    if (!selectable) {
      return;
    }

    selected = !selected;
  }

  const autolinker = new Autolinker({
    // Open links in new window
    newWindow: true,
    // Don't strip protocol prefix
    stripPrefix: false,
    // Don't strip trailing slashes
    stripTrailingSlash: false,
    // Don't truncate links
    truncate: 99999,
    // Add class name to linked links
    className: 'autolinked',
    // Link urls
    urls: true,
    // Link e-mails
    email: true,
    // Don't link phone numbers (doesn't work reliably)
    phone: false,
    // Don't link mentions
    mention: false,
    // Don't link hashtags
    hashtag: false,
  });

  const mentions = $viewModelStore.mentions;

  function getMentionHtml(mention: Mention): string {
    if (mention.type === 'all') {
      return `<span class="mention all">@All</span>`;
    }

    const mentionDisplay = `@${escapeHtmlUnsafeChars(mention.name)}`;

    if (mention.type === 'self') {
      return `<span class="mention me">${mentionDisplay}</span>`;
    }

    const href = `#/conversation/${mention.lookup.type}/${mention.lookup.uid}/`;
    return `<a href="${href}" draggable="false" class="mention">${mentionDisplay}</a>`;
  }

  function textProcessor(text: string | undefined): string {
    if (text === undefined || text === '') {
      return '';
    }

    // Replace mentions
    for (const mention of mentions) {
      text = text.replaceAll(`@[${mention.identityString}]`, getMentionHtml(mention));
    }

    text = markify(text, {
      [TokenType.Asterisk]: 'md-bold',
      [TokenType.Underscore]: 'md-italic',
      [TokenType.Tilde]: 'md-strike',
    });

    return autolinker.link(text);
  }

  async function navigateToContact(): Promise<void> {
    assert($messageStore.ctx === MessageDirection.INBOUND);
    const sender = await $messageStore.controller.sender();

    const route = router.get();

    if (route.aside !== undefined) {
      router.go(
        route.nav,
        ROUTE_DEFINITIONS.main.conversation.withTypedParams({
          receiverLookup: {
            type: ReceiverType.CONTACT,
            uid: sender.ctx,
          },
        }),
        ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({
          contactUid: sender.ctx,
        }),
        undefined,
      );
    } else {
      router.go(
        route.nav,
        ROUTE_DEFINITIONS.main.conversation.withTypedParams({
          receiverLookup: {
            type: ReceiverType.CONTACT,
            uid: sender.ctx,
          },
        }),
        undefined,
        undefined,
      );
    }
  }

  if (messageBody.direction === 'incoming' && !messageBody.isRead) {
    onMount(() => {
      readObserver.observe(messageContainer);
    });

    onDestroy(() => {
      readObserver.unobserve(messageContainer);
    });
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  function transformAvatarImage(image: ReadonlyUint8Array | undefined): Promise<Blob> {
    return image !== undefined
      ? Promise.resolve(new Blob([image], {type: 'image/jpeg'}))
      : eternalPromise();
  }

  function transformContact(contact: ReceiverData<'contact'>): ReceiverData3SC<'contact'> {
    return {
      ...contact,
      avatar: {
        ...contact.avatar,
        img: transformAvatarImage(contact.avatar.img),
      },
    };
  }

  function transformReceiver(receiverData: AnyReceiverData): AnyReceiverData3SC {
    return {
      ...receiverData,
      avatar: {
        ...receiverData.avatar,
        img: transformAvatarImage(receiver.avatar.img),
      },
    };
  }
</script>

<template>
  <div
    class="message-wrapper"
    class:selectable
    class:avatar={messageBody.direction === 'incoming' && receiver.type === 'group'}
    data-direction={messageBody.direction}
    bind:this={messageContainer}
    data-id={messageBody.id}
    on:click={toggleSelect}
  >
    {#if selectable}
      <div class="checkbox">
        <Checkbox checked={selected} />
      </div>
    {/if}

    <div class="container">
      {#if messageBody.direction === 'incoming' && receiver.type === 'group'}
        <div class="avatar-container">
          <span class="avatar" on:click={async () => await navigateToContact()}>
            <AvatarComponent
              {...messageBody.sender.avatar}
              img={eternalPromise()}
              alt=""
              title={messageBody.sender.name}
              shape="circle"
              fontSize="small"
            />
          </span>
        </div>
      {/if}

      <div class="message" use:contextMenuAction={openContextMenuOnMouseEvent}>
        {#if messageBody.type === 'text'}
          <TextMessage
            body={messageBodyText}
            receiver={transformReceiver(receiver)}
            sender={messageBody.direction === 'incoming'
              ? transformContact(messageBody.sender)
              : undefined}
            direction={messageBody.direction}
            date={messageBody.updatedAt}
            status={messageBody.direction === 'outgoing' ? messageBody.status : undefined}
            reaction={messageBody.lastReaction}
            {textProcessor}
          />
        {:else if messageBody.type === 'file'}
          <FileMessage
            body={messageBody.body}
            receiver={transformReceiver(receiver)}
            sender={messageBody.direction === 'incoming'
              ? transformContact(messageBody.sender)
              : undefined}
            direction={messageBody.direction}
            date={messageBody.updatedAt}
            status={messageBody.direction === 'outgoing' ? messageBody.status : undefined}
            reaction={messageBody.lastReaction}
            {textProcessor}
          />
        {:else}
          <UnsupportedMessage message={messageBody} />
        {/if}
        <div class="hover" class:visible={isContextMenuVisible} />
        {#if messageBody.direction === 'incoming' && messageBody.state.type !== 'local'}
          <MessageOverlay incoming={messageBody.state} />
        {:else if messageBody.direction === 'outgoing' && messageBody.state.type !== 'remote'}
          <MessageOverlay outgoing={messageBody.state} />
        {/if}
      </div>
      <div class="options">
        <div
          class="caret"
          class:visible={isContextMenuVisible}
          on:click={openContextMenuOnMouseEvent}
        >
          <MdIcon theme="Outlined">expand_more</MdIcon>
        </div>
        <ContextMenu
          bind:this={contextMenu}
          directionX={messageBody.direction === 'incoming' ? 'auto' : 'left'}
          message={messageBody}
          isGroupConversation={receiver.type === 'group'}
          {...contextMenuPosition}
          on:copy={copyMessageContent}
          on:delete={showDeleteMessageConfirmationModal}
          on:clickoutside={clickoutsideContextMenu}
          on:showMessageDetails={showMessageDetails}
          on:thumbup={() => reactToMessage(MessageReaction.ACKNOWLEDGE)}
          on:thumbdown={() => reactToMessage(MessageReaction.DECLINE)}
          on:forward={showForwardMessageModal}
        />
        <MessageForward
          {services}
          bind:visible={isForwardMessageModalVisible}
          sourceReceiverLookup={receiverLookup}
          messageId={$messageStore.view.id}
        />
        <MessageDetail bind:visible={isMessageDetailModalVisible} message={$messageStore} />
        <MessageDelete
          bind:visible={isDeleteMessageConfirmationModalVisible}
          on:confirm={deleteMessage}
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $optionsWidth: rem(40px);

  .message-wrapper {
    display: grid;
    grid-template: 'message .' auto / auto 1fr;
    padding-left: rem(8px);

    .checkbox {
      grid-area: checkbox;
      place-self: center;
    }

    .container {
      display: grid;
      grid-template: 'message options' auto / auto #{$optionsWidth};

      .message {
        grid-area: message;
        display: grid;
        position: relative;
        justify-self: start;
        border-radius: var(--c-message-border-radius);
        background-color: var(--c-message-background-color-incoming);

        .hover {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          display: none;
          border-radius: var(--c-message-border-radius);
          background-color: var(--c-message-hover-background-color);

          &.visible {
            display: block;
          }
        }
      }

      .options {
        grid-area: options;
        justify-self: start;
        display: grid;
        grid-template: 'caret' min-content / min-content;
        align-items: start;
        justify-content: start;
        padding-left: rem(4px);

        .caret {
          display: none;
          user-select: none;
          justify-self: start;
          --c-icon-font-size: #{rem(24px)};
          color: var(--cc-conversation-message-options-caret-color);
          cursor: pointer;

          &.visible {
            display: grid;
          }
        }
      }

      &:hover {
        .message {
          .hover {
            display: block;
          }
        }
        .options {
          .caret {
            display: grid;
          }
        }
      }
    }

    &.avatar {
      .container {
        display: grid;
        grid-template: 'avatar message options' auto / auto auto #{$optionsWidth};

        .avatar-container {
          grid-area: avatar;
          margin-right: rem(8px);
          font-size: rem(4px);

          .avatar {
            cursor: pointer;
            --c-avatar-size: #{rem(24px)};
          }
        }
      }
    }

    &[data-direction='outgoing'] {
      grid-template: '. message' auto / 1fr auto;

      .container {
        grid-template: 'options message' auto / #{$optionsWidth} auto;
        justify-self: end;
        padding-right: rem(8px);

        .message {
          justify-self: end;
          background-color: var(--c-message-background-color-outgoing);
        }
        .options {
          padding-right: 4px;
          padding-left: 0;
          justify-self: end;
          justify-content: end;
        }
      }

      &.selectable {
        grid-template: 'checkbox . message' auto / min-content 1fr auto;
      }
    }

    &.selectable {
      grid-template: 'checkbox message .' auto / min-content auto 1fr;
      cursor: pointer;

      &:hover {
        background-color: var(--t-nav-background-color);

        &[data-direction='outgoing'] {
          .message {
            background-color: var(--c-message-background-color-outgoing);
          }
        }

        .message {
          .hover {
            display: grid;
          }
        }
        .options {
          .caret {
            display: none;
          }
        }
      }
    }
  }

  .message-wrapper {
    .container {
      .message {
        :global(.md-bold) {
          @extend %markup-bold;
        }
        :global(.md-italic) {
          @extend %markup-italic;
        }
        :global(.md-strike) {
          @extend %markup-strike;
        }
        :global(.mention) {
          @extend %mention;
        }
        :global(.mention.me) {
          @extend %mention-me;
        }
        :global(.mention.all) {
          @extend %mention-all;
        }
      }
    }
  }
</style>
