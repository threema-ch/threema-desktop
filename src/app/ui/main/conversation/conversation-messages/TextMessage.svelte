<script lang="ts">
  import Text from '~/app/ui/generic/form/Text.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageFooter from '~/app/ui/main/conversation/conversation-messages/MessageFooter.svelte';
  import {
    type AnyReceiverData,
    type MessageBodyFor,
    type MessageDirection,
    type MessageStatus as MsgStatus,
    type Reaction,
    type ReceiverData,
  } from '~/common/viewmodel/types';
  import {Mention} from '~/common/viewmodel/utils/mentions';

  /**
   * The text to be parsed and displayed with the requested features.
   */
  export let body: MessageBodyFor<'text'>;

  /**
   * Receiver type.
   */
  export let receiver: AnyReceiverData;

  /**
   * Sender of the message.
   */
  export let sender: ReceiverData<'contact'> | undefined = undefined;

  /**
   * Incoming or Outgoing direction.
   */
  export let direction: MessageDirection;

  /**
   * The last action date.
   */
  export let date: Date;

  /**
   * The last action status. Only defined for outgoing messages.
   */
  export let status: MsgStatus | undefined;

  /**
   * The last reaction
   */
  export let reaction: undefined | Reaction;

  /**
   * Mentions parsed from the message
   */
  export let mentions: Mention[];

  // Check if we will display the contact informations.
  const showContact =
    (receiver.type === 'group' || receiver.type === 'distribution-list') && sender !== undefined;
</script>

<template>
  <div
    class="message"
    data-direction={direction}
    data-receiver-type={receiver.type}
    data-contact={showContact}
  >
    {#if showContact && sender !== undefined}
      <span class="contact">
        <MessageContact name={sender.name} color={sender.avatar.color} />
      </span>
    {/if}
    <span class="text">
      <Text text={body.text} {mentions} />
    </span>
    <MessageFooter
      {direction}
      {date}
      {status}
      receiverType={receiver.type}
      reaction={reaction?.type}
    />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .message {
    display: grid;
    grid-template:
      'contact' auto
      'text' auto
      'footer' auto
      / auto;

    grid-row-gap: var(--mc-message-row-gap);
    padding: var(--mc-message-text-padding);

    .contact {
      grid-area: contact;
    }

    .text {
      grid-area: text;
    }
  }
</style>
