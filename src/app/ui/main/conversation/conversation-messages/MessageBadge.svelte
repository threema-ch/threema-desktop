<script lang="ts">
  import Time from '~/app/ui/generic/form/Time.svelte';
  import MessageStatus from '~/app/ui/main/conversation/conversation-messages/MessageStatus.svelte';
  import {type MessageDirection, type MessageReaction, type ReceiverType} from '~/common/enum';
  import {type MessageStatus as MsgStatus} from '~/common/viewmodel/types';

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

  $: showStatus = status !== undefined || reaction !== undefined;
</script>

<template>
  <span class="badge">
    <span class="time">
      <Time {date} format="time" />
    </span>
    {#if showStatus}
      <span class="status">
        <MessageStatus
          {direction}
          {status}
          {reaction}
          {receiverType}
          outgoingReactionDisplay="thumb"
        />
      </span>
    {/if}
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  .badge {
    display: flex;
    gap: var(--mc-message-footer-column-gap);
    justify-items: end;
    align-items: center;
    padding: rem(1px) rem(6px);
    border-radius: rem(10px);
    color: var(--mc-message-badge-color);
    background-color: var(--mc-message-badge-background-color);

    .time {
      @extend %font-small-400;
    }

    .status {
      @include def-var(--c-icon-font-size, var(--mc-message-footer-icon-size));
    }
  }
</style>
