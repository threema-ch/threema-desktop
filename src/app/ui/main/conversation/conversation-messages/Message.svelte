<!--
  @component
  Display a single message with metadata (content of a message bubble)
-->
<script lang="ts">
  import IconButtonProgressBarOverlay from '#3sc/components/blocks/Button/IconButtonProgressBarOverlay.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageFooter from '~/app/ui/main/conversation/conversation-messages/MessageFooter.svelte';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModel} from '~/common/viewmodel/conversation-message';
  import {
    type AnyMessageBody,
    type AnyReceiverData,
    type IncomingMessage,
    type Message,
  } from '~/common/viewmodel/types';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  import MessageContent from './MessageContent.svelte';
  import MessageQuote from './MessageQuote.svelte';

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let message: Message<AnyMessageBody>;

  /**
   * Receiver type.
   */
  export let receiver: AnyReceiverData;

  /**
   * Quote
   */
  export let quote: Remote<ConversationMessageViewModel['quote']>;

  /**
   * Mentions parsed from the message
   */
  export let mentions: Remote<Mention>[];

  // Check if we will display the contact informations.
  function showContactFor(
    recv: AnyReceiverData,
    msg: Message<AnyMessageBody>,
  ): msg is IncomingMessage<AnyMessageBody> {
    return (
      (recv.type === 'group' || recv.type === 'distribution-list') &&
      msg.direction === 'incoming' &&
      msg.sender !== undefined
    );
  }
</script>

<template>
  <div
    class="message"
    data-direction={message.direction}
    data-receiver-type={receiver.type}
    data-contact={showContactFor(receiver, message)}
  >
    {#if message.state.type !== 'synced'}
      <div class="overlay">
        <button class="overlay-button">
          {#if message.state.type === 'unsynced'}
            <MdIcon theme="Filled">file_download</MdIcon>
          {:else if message.state.type === 'syncing'}
            <MdIcon theme="Filled">close</MdIcon>
            <IconButtonProgressBarOverlay />
          {/if}
        </button>
      </div>
    {/if}

    {#if showContactFor(receiver, message)}
      <span class="contact">
        <MessageContact name={message.sender.name} color={message.sender.profilePicture.color} />
      </span>
    {/if}
    {#if quote !== undefined}
      <div class="quote">
        {#if quote === 'not-found'}
          <p class="quote-not-found">The quoted message could not be found.</p>
        {:else}
          <MessageQuote {quote} />
        {/if}
      </div>
    {/if}
    <span class="content">
      <MessageContent {message} {mentions} />
    </span>
    <span class="footer">
      <MessageFooter
        direction={message.direction}
        date={message.updatedAt}
        status={message.direction === 'outgoing' ? message.status : undefined}
        receiverType={receiver.type}
        reaction={message.lastReaction?.type}
      />
    </span>
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
      margin-bottom: rem(2px);
      &:not(:first-child) {
        margin-top: rem(2px);
      }
    }

    .footer {
      grid-area: footer;
    }
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
      @include circle-button;
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
