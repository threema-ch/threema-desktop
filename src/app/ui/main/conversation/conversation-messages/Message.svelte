<!--
  @component
  Display a single message with metadata (content of a message bubble)
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButtonProgressBarOverlay from '#3sc/components/blocks/Button/IconButtonProgressBarOverlay.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {i18n} from '~/app/ui/i18n';
  import MessageBadge from '~/app/ui/main/conversation/conversation-messages/MessageBadge.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageContent from '~/app/ui/main/conversation/conversation-messages/MessageContent.svelte';
  import MessageFooter from '~/app/ui/main/conversation/conversation-messages/MessageFooter.svelte';
  import MessageQuote from '~/app/ui/main/conversation/conversation-messages/MessageQuote.svelte';
  import {MessageDirection, ReceiverType} from '~/common/enum';
  import {type AnyReceiverStore} from '~/common/model';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';
  import {
    type AnyMessageBody,
    type IncomingMessage,
    type Message,
    type MessageStatus,
  } from '~/common/viewmodel/types';

  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  const viewModelStore = viewModelBundle.viewModel;

  $: message = $viewModelStore.body;
  $: quote = $viewModelStore.quote;

  /**
   * The Conversation's receiver
   */
  export let receiver: Remote<AnyReceiverStore>;

  const dispatch = createEventDispatcher<{saveFile: undefined; abortSync: undefined}>();

  // Check if we will display the contact information.
  function showContactFor(
    receiverType: ReceiverType,
    msg: Message<AnyMessageBody>,
  ): msg is IncomingMessage<AnyMessageBody> {
    return (
      (receiverType === ReceiverType.GROUP || receiverType === ReceiverType.DISTRIBUTION_LIST) &&
      msg.direction === MessageDirection.INBOUND &&
      msg.sender !== undefined
    );
  }

  /**
   * Handle a click on the message overlay button.
   */
  function handleMessageOverlayClick(): void {
    switch (message.state.type) {
      case 'unsynced':
        // Start down- or upload
        // TODO(DESK-961): Handle upload resumption for local unsynced files
        dispatch('saveFile');
        break;
      case 'syncing':
        dispatch('abortSync');
        break;
      case 'synced':
      case 'failed':
        // Nothing to do
        break;
      default:
        unreachable(message.state);
    }
  }

  let messageFooterStatus: MessageStatus | undefined;
  $: if (message.state.type === 'failed') {
    messageFooterStatus = 'error';
  } else if (message.direction === MessageDirection.OUTBOUND) {
    messageFooterStatus = message.status;
  } else {
    messageFooterStatus = undefined;
  }

  $: isQuoted = quote !== undefined && quote !== 'not-found';
  $: isImageWithoutCaption = message.type === 'image' && message.body.caption === undefined;
</script>

<template>
  <div
    class="message"
    class:thin-border={message.type === 'image'}
    data-contact={showContactFor(receiver.type, message)}
  >
    {#if showContactFor(receiver.type, message)}
      <span class="contact">
        <MessageContact name={message.sender.name} color={message.sender.profilePicture.color} />
      </span>
    {/if}
    {#if quote !== undefined}
      <div class="quote">
        {#if quote === 'not-found'}
          <p class="quote-not-found">
            {$i18n.t(
              'messaging.error--quoted-message-not-found',
              'The quoted message could not be found.',
            )}
          </p>
        {:else}
          <MessageQuote viewModelBundle={quote} />
        {/if}
      </div>
    {/if}
    <span class="content">
      <MessageContent
        {message}
        messageViewModelController={viewModelBundle.viewModelController}
        mentions={$viewModelStore.mentions}
        {isQuoted}
        on:saveFile={() => dispatch('saveFile')}
      />
    </span>

    {#if isImageWithoutCaption}
      <span class="badge">
        <MessageBadge
          direction={message.direction}
          date={message.updatedAt}
          status={messageFooterStatus}
          receiverType={receiver.type}
          reaction={message.lastReaction?.type}
        />
      </span>
    {:else}
      <span class="footer">
        <MessageFooter
          direction={message.direction}
          date={message.updatedAt}
          status={messageFooterStatus}
          receiverType={receiver.type}
          reaction={message.lastReaction?.type}
        />
      </span>
    {/if}

    {#if message.type === 'file'}
      {#if message.state.type === 'unsynced' || message.state.type === 'syncing'}
        <div class="overlay">
          <button class="overlay-button" on:click={handleMessageOverlayClick}>
            {#if message.state.type === 'unsynced'}
              {#if $viewModelStore.syncDirection === 'download'}
                <MdIcon
                  theme="Filled"
                  title={$i18n.t('messaging.action--file-sync-download', 'Click to download file')}
                  >file_download</MdIcon
                >
              {:else if $viewModelStore.syncDirection === 'upload'}
                <MdIcon
                  theme="Filled"
                  title={$i18n.t('messaging.action--file-sync-upload', 'Click to upload file')}
                  >file_upload</MdIcon
                >
              {:else}
                <MdIcon
                  theme="Filled"
                  title={$i18n.t(
                    'messaging.action--file-sync-unknown-direction',
                    'Unknown sync direction',
                  )}>help</MdIcon
                >
              {/if}
            {:else if message.state.type === 'syncing'}
              <!-- TODO(DESK-948): Cancellation <MdIcon theme="Filled">close</MdIcon>-->
              <IconButtonProgressBarOverlay />
            {/if}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .message {
    display: grid;
    grid-template:
      'contact' auto
      'quote' auto
      'content' auto
      'footer' auto
      / auto;

    padding: rem(8px);

    &.thin-border {
      padding: rem(3px);
    }

    .contact {
      grid-area: contact;
    }

    .quote {
      grid-area: quote;
      padding-bottom: rem(8px);

      .quote-not-found {
        margin: 0;
        border-left: solid var(--mc-message-quote-border-width) $warning-orange;
        padding: rem(8px);
        font-style: italic;
      }
    }

    .content {
      grid-area: content;

      &:not(:first-child) {
        margin-top: rem(2px);
      }
    }

    .footer {
      grid-area: footer;
    }
  }

  .badge {
    position: absolute;
    display: flex;
    right: rem(8px);
    bottom: rem(8px);
  }

  .overlay {
    position: absolute;
    background-color: var(--mc-message-overlay-background-color);
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .overlay-button {
      @include clicktarget-button-circle;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--mc-message-overlay-button-color);
      background-color: var(--mc-message-overlay-button-background-color);
      opacity: 54%;
      width: rem(44px);
      height: rem(44px);
      font-size: rem(22px);

      --c-icon-button-naked-outer-background-color--hover: var(
        --mc-message-overlay-button-background-color--hover
      );
      --c-icon-button-naked-outer-background-color--focus: var(
        --mc-message-overlay-button-background-color--focus
      );
      --c-icon-button-naked-outer-background-color--active: var(
        --mc-message-overlay-button-background-color--active
      );
    }
  }
</style>
