<script lang="ts">
  import Time from '~/app/ui/generic/form/Time.svelte';
  import MessageStatus from '~/app/ui/main/conversation/conversation-messages/MessageStatus.svelte';
  import {type MessageDirection, type MessageReaction} from '~/common/enum';
  import {type MessageStatus as MsgStatus, type ReceiverType} from '~/common/viewmodel/types';

  /**
   * The last action date.
   */
  export let date: Date;

  /**
   * The message direction
   */
  export let direction: MessageDirection;

  /**
   * The last action status.
   */
  export let status: MsgStatus | undefined;

  /**
   * The receiver type
   */
  export let receiverType: ReceiverType;

  /**
   * The last reaction
   */
  export let reaction: MessageReaction | undefined;
</script>

<template>
  <span class="footer">
    <span class="time">
      <Time {date} />
    </span>
    <span class="status">
      <MessageStatus
        {direction}
        {status}
        {reaction}
        {receiverType}
        outgoingReactionDisplay="thumb"
      />
    </span>
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  .footer {
    grid-area: footer;
    display: grid;
    grid-template: 'time status' auto / 1fr;
    column-gap: var(--mc-message-footer-column-gap);
    justify-items: end;
    align-items: center;

    .time {
      @extend %font-small-400;
      grid-area: time;
      color: var(--mc-message-footer-time);
    }

    .status {
      grid-area: status;
      @include def-var(--c-icon-font-size, var(--mc-message-footer-icon-size));
    }
  }
</style>
