<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {
    MessageDirection,
    MessageReaction,
    MessageReactionUtils,
    ReceiverType,
  } from '~/common/enum';
  import {unreachable} from '~/common/utils/assert';
  import type {MessageStatus} from '~/common/viewmodel/types';

  export let direction: MessageDirection;
  export let status: MessageStatus | undefined;
  export let reaction: MessageReaction | undefined = undefined;
  export let outgoingReactionDisplay: 'thumb' | 'arrow';
  export let receiverType: ReceiverType;

  function iconForReaction(value: MessageReaction): string {
    switch (value) {
      case MessageReaction.ACKNOWLEDGE:
        return 'thumb_up';

      case MessageReaction.DECLINE:
        return 'thumb_down';

      default:
        return unreachable(value);
    }
  }

  function iconForStatus(value: MessageStatus): string {
    switch (value) {
      case 'pending':
        return 'file_upload';

      case 'sent':
        return 'email';

      case 'delivered':
        return 'move_to_inbox';

      case 'read':
        return 'visibility';

      case 'error':
        return 'report_problem';

      default:
        return unreachable(value);
    }
  }

  // Hide status for group messages, except for pending state.
  $: isVisible = receiverType !== ReceiverType.GROUP || status === 'pending' || status === 'error';

  let iconName: string | undefined = undefined;
  $: if (direction === MessageDirection.INBOUND && outgoingReactionDisplay === 'arrow') {
    iconName = 'reply';
  } else if (reaction !== undefined) {
    iconName = iconForReaction(reaction);
  } else if (status !== undefined) {
    iconName = iconForStatus(status);
  } else {
    iconName = undefined;
  }
</script>

<template>
  {#if isVisible && iconName !== undefined}
    <span
      data-direction={direction}
      data-reaction={reaction === undefined ? undefined : MessageReactionUtils.NAME_OF[reaction]}
      data-status={status}
    >
      <MdIcon theme="Filled">{iconName}</MdIcon>
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
