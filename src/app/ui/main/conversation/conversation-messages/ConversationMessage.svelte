<!--
  @component
  Message row as shown in a conversation list.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Checkbox from '#3sc/components/blocks/Checkbox/Checkbox.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePictureComponent from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import ContextMenuWrapperWithPopperJs from '~/app/ui/generic/context-menu/ContextMenuWrapperWithPopperJS.svelte';
  import {type ConversationMessageContextMenuEvent} from '~/app/ui/main/conversation/conversation-messages';
  import ConversationMessageContextMenu from '~/app/ui/main/conversation/conversation-messages/ConversationMessageContextMenu.svelte';
  import MessageComponent from '~/app/ui/main/conversation/conversation-messages/Message.svelte';
  import MessageDelete from '~/app/ui/modal/MessageDelete.svelte';
  import MessageDetail from '~/app/ui/modal/MessageDetail.svelte';
  import MessageForward from '~/app/ui/modal/MessageForward.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type DbReceiverLookup} from '~/common/db';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {
    MessageDirection,
    MessageDirectionUtils,
    MessageReaction,
    ReceiverType,
  } from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import {
    type AnyMessageModelStore,
    type AnyReceiverStore,
    type RemoteModelStoreFor,
  } from '~/common/model';
  import {type MessageId} from '~/common/network/types';
  import {type ReadonlyUint8Array, type u32} from '~/common/types';
  import {assert, ensureError, unreachable} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {type RemoteStore} from '~/common/utils/store';
  import {type ConversationMessageViewModel} from '~/common/viewmodel/conversation-message';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation-message');

  /**
   * The Conversation's receiver
   */
  export let receiver: Remote<AnyReceiverStore>;

  /**
   * Current receiver lookup
   */
  export let receiverLookup: DbReceiverLookup;
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
   * The ConversationMessageViewModel
   */
  export let viewModelStore: RemoteStore<Remote<ConversationMessageViewModel>>;

  /**
   * The ModelStore for the Message
   */
  export let messageStore: RemoteModelStoreFor<AnyMessageModelStore>;

  /**
   * The reference to the element which contains this message element.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  export let container: HTMLElement | null;

  let messageBody: Message<AnyMessageBody> = $viewModelStore.body;
  $: messageBody = $viewModelStore.body;

  // Context menu
  // let contextMenu: ContextMenu;
  let contextMenuWrapper: ContextMenuWrapperWithPopperJs;
  let contextMenuPosition: {x: u32; y: u32} | undefined = undefined;
  let isContextMenuVisible = false;

  let isDeleteMessageConfirmationModalVisible = false;
  let isForwardMessageModalVisible = false;
  let isMessageDetailModalVisible = false;

  let hrefToCopy: string | undefined = undefined;
  let messageContentToCopy: string | undefined = undefined;

  function extractHrefFromEventTarget(event: MouseEvent): string | undefined {
    const href = (event.target as HTMLElement)?.getAttribute('href') ?? undefined;
    return href === undefined || href.length === 0 ? undefined : href;
  }

  function extractMessageContent(): string | undefined {
    let content: string | undefined;
    switch (messageBody.type) {
      case 'text':
        content = messageBody.body.text;
        break;
      case 'file':
      case 'image':
      case 'audio':
      case 'video':
        content = messageBody.body.caption;
        break;
      case 'location':
        // TODO(DESK-143)
        break;
      case 'quote':
        break;
      default:
        unreachable(messageBody);
    }

    return content === undefined || content.length === 0 ? undefined : content;
  }

  function handleContextMenuAction(event: MouseEvent): void {
    if (selectable) {
      return;
    }

    messageContentToCopy = extractMessageContent();
    hrefToCopy = extractHrefFromEventTarget(event);

    if (event.type === 'contextmenu') {
      contextMenuPosition = {x: event.clientX, y: event.clientY};
    } else {
      contextMenuPosition = undefined;
    }

    contextMenuWrapper.open();
  }

  function handleContextMenuTriggerClicked(): void {
    if (selectable) {
      return;
    }

    contextMenuPosition = undefined;
    messageContentToCopy = extractMessageContent();
  }

  function handleContextMenuEvent(type: ConversationMessageContextMenuEvent): void {
    contextMenuWrapper.close();

    switch (type) {
      case 'thumbup':
      case 'thumbdown':
        if ($messageStore.ctx !== MessageDirection.INBOUND) {
          break;
        }
        $messageStore.controller.reaction
          .fromLocal(
            type === 'thumbdown' ? MessageReaction.DECLINE : MessageReaction.ACKNOWLEDGE,
            new Date(),
          )
          .catch(() => {
            const message = 'Could not react to message';

            log.error(message);
            toast.addSimpleFailure(message);
          });
        break;
      case 'copy':
        copyMessageContent();
        break;
      case 'copyLink':
        copyLink();
        break;
      case 'delete':
        isDeleteMessageConfirmationModalVisible = true;
        break;
      case 'forward':
        isForwardMessageModalVisible = true;
        break;
      case 'showMessageDetails':
        isMessageDetailModalVisible = true;
        break;
      case 'quote':
        dispatchEvent('quoteMessage', viewModelStore);
        break;
      default:
        unreachable(type);
    }
  }

  function copyLink(): void {
    if (hrefToCopy !== undefined) {
      navigator.clipboard
        .writeText(hrefToCopy)
        .then(() => toast.addSimpleSuccess('Link copied to clipboard'))
        .catch((error) => {
          const message = 'Could not copy link to clipboard';

          log.error(message, error);
          toast.addSimpleFailure(message);
        });
      hrefToCopy = undefined;
    } else {
      log.warn('Attempting to copy undefined link');
    }
  }

  function copyMessageContent(): void {
    if (messageContentToCopy !== undefined) {
      navigator.clipboard
        .writeText(messageContentToCopy)
        .then(() => toast.addSimpleSuccess('Message content copied to clipboard'))
        .catch((error) => {
          const message = 'Could not copy message content to clipboard';

          log.error(message, error);
          toast.addSimpleFailure(message);
        });
      messageContentToCopy = undefined;
    } else {
      log.warn('Attempting to copy undefined message content');
      toast.addSimpleFailure('Nothing to copy');
    }
  }

  function deleteMessage(): void {
    dispatchEvent('deleteMessage', $messageStore.view.id);
    isDeleteMessageConfirmationModalVisible = false;
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

  /**
   * Save the specified bytes as a file on the file system.
   */
  function saveBytesAsFile(bytes: ReadonlyUint8Array, fileName: string, mediaType: string): void {
    const blob = new Blob([bytes], {type: mediaType});
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    // TODO(DESK-949): Improved download UX
  }

  /**
   * Retrieve the current message data and save it to the file system.
   */
  async function saveFile(): Promise<void> {
    if (messageStore.type !== 'file') {
      log.warn(`saveFile called for ${messageStore.type} message`);
      return;
    }

    const store = messageStore.get();
    let blobBytes;
    try {
      blobBytes = await store.controller.blob();
    } catch (error) {
      const message = 'Could not retrieve file data';

      log.error(message, extractErrorMessage(ensureError(error), 'short'));
      toast.addSimpleFailure(message);
      return;
    }

    saveBytesAsFile(blobBytes, store.view.fileName ?? 'download', store.view.mediaType);
  }

  const dispatchEvent = createEventDispatcher<{
    readonly quoteMessage: RemoteStore<Remote<ConversationMessageViewModel>>;
    readonly deleteMessage: MessageId;
  }>();
</script>

<template>
  <div
    class="message-wrapper"
    class:selectable
    class:profile-picture={messageBody.direction === MessageDirection.INBOUND &&
      receiver.type === ReceiverType.GROUP}
    data-direction={MessageDirectionUtils.NAME_OF[messageBody.direction]}
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
      {#if messageBody.direction === MessageDirection.INBOUND && receiver.type === ReceiverType.GROUP}
        <div class="profile-picture-container">
          <button class="profile-picture" on:click={async () => await navigateToContact()}>
            <ProfilePictureComponent
              {...messageBody.sender.profilePicture}
              img={transformProfilePicture(messageBody.sender.profilePicture.img)}
              alt=""
              title={messageBody.sender.name}
              shape="circle"
              fontSize="small"
            />
          </button>
        </div>
      {/if}

      <div class="message" use:contextMenuAction={handleContextMenuAction}>
        <MessageComponent
          messageViewModel={$viewModelStore}
          {receiver}
          on:saveFile={saveFile}
          on:abortSync={() => {
            /* TODO(DESK-948): Implement cancellation */
          }}
        />
        <div class="hover" class:visible={isContextMenuVisible} />
      </div>
      <div class="options">
        <ContextMenuWrapperWithPopperJs
          bind:this={contextMenuWrapper}
          position={contextMenuPosition}
          placement={messageBody.direction === MessageDirection.INBOUND
            ? 'bottom-start'
            : 'bottom-end'}
          offset={{
            skidding: 0,
            distance: 4,
          }}
          container={container ?? undefined}
          restrictBoundsToContainer={true}
          triggerBehavior="open"
          on:clickTrigger={handleContextMenuTriggerClicked}
          on:open={() => {
            isContextMenuVisible = true;
          }}
          on:close={() => {
            isContextMenuVisible = false;
          }}
        >
          <button slot="trigger" class="caret" class:visible={isContextMenuVisible}>
            <MdIcon theme="Outlined">expand_more</MdIcon>
          </button>

          <ConversationMessageContextMenu
            slot="panel"
            message={messageBody}
            isGroupConversation={receiver.type === ReceiverType.GROUP}
            options={{
              showAction: {
                copyLink: hrefToCopy !== undefined,
                copyMessage: messageContentToCopy !== undefined,
                forward: messageBody.type === 'text',
              },
            }}
            on:copy={() => handleContextMenuEvent('copy')}
            on:copyLink={() => handleContextMenuEvent('copyLink')}
            on:delete={() => handleContextMenuEvent('delete')}
            on:showMessageDetails={() => handleContextMenuEvent('showMessageDetails')}
            on:thumbup={() => handleContextMenuEvent('thumbup')}
            on:thumbdown={() => handleContextMenuEvent('thumbdown')}
            on:forward={() => handleContextMenuEvent('forward')}
            on:quote={() => handleContextMenuEvent('quote')}
          />
        </ContextMenuWrapperWithPopperJs>
        {#if isForwardMessageModalVisible}
          <MessageForward
            {services}
            bind:visible={isForwardMessageModalVisible}
            sourceReceiverLookup={receiverLookup}
            messageId={$messageStore.view.id}
          />
        {/if}
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
        overflow: hidden;
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
          @include clicktarget-button-circle;
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
            @include clicktarget-button-circle;
            --c-profile-picture-size: #{rem(24px)};
          }
        }
      }
    }

    &[data-direction='OUTBOUND'] {
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

        &[data-direction='OUTBOUND'] {
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
