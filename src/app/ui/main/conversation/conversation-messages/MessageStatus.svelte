<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {
    type MessageDirection,
    type MessageReaction,
    type MessageStatus,
    type ReceiverType,
  } from '~/common/viewmodel/types';

  export let direction: MessageDirection;
  export let status: MessageStatus | undefined;
  export let reaction: MessageReaction | undefined = undefined;
  export let outgoingReactionDisplay: 'thumb' | 'arrow';
  export let receiverType: ReceiverType;
</script>

<template>
  <span
    data-direction={direction}
    data-reaction={reaction}
    data-status={status}
    data-receiver-type={receiverType}
  >
    {#if direction === 'incoming' && outgoingReactionDisplay === 'arrow'}
      <MdIcon theme="Filled">reply</MdIcon>
    {:else if reaction === 'acknowledged'}
      <MdIcon theme="Filled">thumb_up</MdIcon>
    {:else if reaction === 'declined'}
      <MdIcon theme="Filled">thumb_down</MdIcon>
    {:else if status === 'pending'}
      <MdIcon theme="Filled">file_upload</MdIcon>
    {:else if status === 'sent'}
      <MdIcon theme="Filled">email</MdIcon>
    {:else if status === 'delivered'}
      <MdIcon theme="Filled">move_to_inbox</MdIcon>
    {:else if status === 'read'}
      <MdIcon theme="Filled">visibility</MdIcon>
    {:else if status === 'error'}
      <MdIcon theme="Filled">report_problem</MdIcon>
    {/if}
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  span {
    display: grid;

    &[data-status='error'] {
      color: var(--mc-message-status-error-color);
    }

    &[data-reaction='acknowledged'] {
      color: var(--mc-message-status-acknowledged-color);
    }

    &[data-reaction='declined'] {
      color: var(--mc-message-status-declined-color);
    }

    // On Group conversations, only show pending state
    &[data-receiver-type='group'] {
      &:not([data-status='pending']) {
        display: none;
      }
    }
  }
</style>
