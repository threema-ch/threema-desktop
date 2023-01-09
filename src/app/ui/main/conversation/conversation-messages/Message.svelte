<!--
  @component
  Display a single message with metadata (content of a message bubble)
-->
<script lang="ts">
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageFooter from '~/app/ui/main/conversation/conversation-messages/MessageFooter.svelte';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessage} from '~/common/viewmodel/conversation-messages';
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
  export let quote: Remote<ConversationMessage['quote']>;

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
    {#if showContactFor(receiver, message)}
      <span class="contact">
        <MessageContact name={message.sender.name} color={message.sender.avatar.color} />
      </span>
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
      'content' auto
      'footer' auto
      / auto;

    grid-row-gap: var(--mc-message-row-gap);

    .contact {
      grid-area: contact;
      padding: var(--mc-message-contact-padding) var(--mc-message-contact-padding) 0
        var(--mc-message-contact-padding);
    }

    .content {
      grid-area: content;
    }

    .footer {
      grid-area: footer;

      padding: 0 var(--mc-message-footer-padding) var(--mc-message-footer-padding)
        var(--mc-message-footer-padding);
    }
  }
</style>
