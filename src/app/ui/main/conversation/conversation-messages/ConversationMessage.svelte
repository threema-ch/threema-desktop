<!--
  @component
  Message row as shown in a conversation list.
-->
<script lang="ts">
  import Checkbox from '#3sc/components/blocks/Checkbox/Checkbox.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePictureComponent from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import {type ConversationData} from '~/app/ui/main/conversation';
  import ContextMenu from '~/app/ui/main/conversation/conversation-messages/ConversationMessageContextMenu.svelte';
  import MessageComponent from '~/app/ui/main/conversation/conversation-messages/Message.svelte';
  import MessageDelete from '~/app/ui/modal/MessageDelete.svelte';
  import MessageDetail from '~/app/ui/modal/MessageDetail.svelte';
  import MessageForward from '~/app/ui/modal/MessageForward.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type DbReceiverLookup} from '~/common/db';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {MessageDirection, MessageReaction, ReceiverType} from '~/common/enum';
  import {
    type AnyMessageModelStore,
    type Conversation,
    type RemoteModelStoreFor,
  } from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {assert, assertUnreachable} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {type RemoteStore} from '~/common/utils/store';
  import {type ConversationMessage} from '~/common/viewmodel/conversation-messages';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';

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
  export let viewModelStore: RemoteStore<Remote<ConversationMessage>>;

  /**
   * The ModelStore for the Message
   */
  export let messageStore: RemoteModelStoreFor<AnyMessageModelStore>;

  let messageBody: Message<AnyMessageBody> = $viewModelStore.body;
  $: messageBody = $viewModelStore.body;

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
    // Todo(DESK-483): handle error
    conversation
      .get()
      .controller.removeMessage.fromLocal($messageStore.view.id)
      .catch(() => toast.addSimpleFailure('Could not delete message'));
    isDeleteMessageConfirmationModalVisible = false;
  }

  function reactToMessage(reaction: MessageReaction): void {
    if ($messageStore.ctx === MessageDirection.INBOUND) {
      // Todo(DESK-483): handle error
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
</script>

<template>
  <div
    class="message-wrapper"
    class:selectable
    class:profile-picture={messageBody.direction === 'incoming' && receiver.type === 'group'}
    data-direction={messageBody.direction}
    data-id={messageBody.id}
    on:click={toggleSelect}
    on:keypress={toggleSelect}
  >
    {#if selectable}
      <div class="checkbox">
        <Checkbox checked={selected} />
      </div>
    {/if}

    <div class="container">
      {#if messageBody.direction === 'incoming' && receiver.type === 'group'}
        <div class="profile-picture-container">
          <span class="profile-picture" on:click={async () => await navigateToContact()}>
            <ProfilePictureComponent
              {...messageBody.sender.profilePicture}
              img={transformProfilePicture(messageBody.sender.profilePicture.img)}
              alt=""
              title={messageBody.sender.name}
              shape="circle"
              fontSize="small"
            />
          </span>
        </div>
      {/if}

      <div class="message" use:contextMenuAction={openContextMenuOnMouseEvent}>
        <MessageComponent
          message={messageBody}
          quote={$viewModelStore.quote}
          {receiver}
          mentions={$viewModelStore.mentions}
        />
        <div class="hover" class:visible={isContextMenuVisible} />
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
        border-radius: var(--mc-message-border-radius);
        background-color: var(--mc-message-background-color-incoming);

        .hover {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          display: none;
          border-radius: var(--mc-message-border-radius);
          background-color: var(--mc-message-hover-background-color);

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

    &.profile-picture {
      .container {
        display: grid;
        grid-template: 'profile-picture message options' auto / auto auto #{$optionsWidth};

        .profile-picture-container {
          grid-area: profile-picture;
          margin-right: rem(8px);
          font-size: rem(4px);

          .profile-picture {
            cursor: pointer;
            --c-profile-picture-size: #{rem(24px)};
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
          background-color: var(--mc-message-background-color-outgoing);
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
            background-color: var(--mc-message-background-color-outgoing);
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
