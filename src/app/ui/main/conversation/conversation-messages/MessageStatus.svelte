<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {
    MessageDirection,
    MessageReaction,
    MessageReactionUtils,
    ReceiverType,
  } from '~/common/enum';
  import {type MessageStatus} from '~/common/viewmodel/types';

  export let direction: MessageDirection;
  export let status: MessageStatus | undefined;
  export let reaction: MessageReaction | undefined = undefined;
  export let outgoingReactionDisplay: 'thumb' | 'arrow';
  export let receiverType: ReceiverType;

  // Hide status for group messages, except for pending state.
  $: isVisible = receiverType !== ReceiverType.GROUP || status === 'pending' || status === 'error';
</script>

<template>
  {#if isVisible}
    <span
      data-direction={direction}
      data-reaction={reaction === undefined ? undefined : MessageReactionUtils.NAME_OF[reaction]}
      data-status={status}
    >
      {#if direction === MessageDirection.INBOUND && outgoingReactionDisplay === 'arrow'}
        <MdIcon theme="Filled">reply</MdIcon>
      {:else if reaction === MessageReaction.ACKNOWLEDGE}
        <MdIcon theme="Filled">thumb_up</MdIcon>
      {:else if reaction === MessageReaction.DECLINE}
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
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  span {
    display: grid;

    &[data-status='error'] {
      color: var(--mc-message-status-error-color);
    }

    &[data-reaction='ACKNOWLEDGE'] {
      color: var(--mc-message-status-acknowledged-color);
    }

    &[data-reaction='DECLINE'] {
      color: var(--mc-message-status-declined-color);
    }
  }
</style>
