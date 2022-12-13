<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import Divider from '~/app/ui/nav/receiver/detail/Divider.svelte';
  import ListElement from '~/app/ui/nav/receiver/detail/ListElement.svelte';
  import {MessageDirection, MessageReaction, MessageReactionUtils} from '~/common/enum';
  import {type AnyMessageModel, type RemoteModelFor} from '~/common/model';
  import {unreachable} from '~/common/utils/assert';
  import {u64ToHexLe} from '~/common/utils/number';

  export let visible: boolean;
  export let message: RemoteModelFor<AnyMessageModel>;

  function mapMessageReactionToIcon(reactionType: MessageReaction): 'thumb_up' | 'thumb_down' {
    switch (reactionType) {
      case MessageReaction.ACKNOWLEDGE:
        return 'thumb_up';
      case MessageReaction.DECLINE:
        return 'thumb_down';
      default:
        return unreachable(reactionType);
    }
  }
</script>

<template>
  <ModalWrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <TitleAndClose let:modal {modal} slot="header" title="Message Details" />
      <div class="body" slot="body">
        <ListElement label="Created">{message.view.createdAt.toLocaleString()}</ListElement>
        {#if message.ctx === MessageDirection.INBOUND}
          <ListElement label="Received">{message.view.receivedAt.toLocaleString()}</ListElement>
        {/if}
        {#if message.ctx === MessageDirection.OUTBOUND}
          <ListElement label="Sent">{message.view.sentAt?.toLocaleString() ?? '-'}</ListElement>
          <ListElement label="Delivered"
            >{message.view.deliveredAt?.toLocaleString() ?? '-'}</ListElement
          >
        {/if}
        <ListElement label="Read">{message.view.readAt?.toLocaleString() ?? '-'}</ListElement>
        <Divider />
        <ListElement label="Message ID">{u64ToHexLe(message.view.id)}</ListElement>
        <Divider />
        <ListElement label="Last Reaction">
          {#if message.view.lastReaction === undefined}
            -
          {:else}
            <div class="reaction">
              <div
                class="thumb"
                data-reaction={MessageReactionUtils.NAME_OF[message.view.lastReaction.type]}
              >
                <MdIcon theme="Filled"
                  >{mapMessageReactionToIcon(message.view.lastReaction.type)}</MdIcon
                >
              </div>
              <div class="date">
                {message.view.lastReaction.at.toLocaleString()}
              </div>
            </div>
          {/if}
        </ListElement>
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    padding: rem(10px) 0;
    width: rem(480px);

    .reaction {
      display: grid;
      column-gap: rem(8px);
      grid-template: 'thumb date' auto / min-content auto;

      .thumb {
        display: grid;
        align-items: center;
        &[data-reaction='ACKNOWLEDGE'] {
          color: var(--mc-message-status-acknowledged-color);
        }
        &[data-reaction='DECLINE'] {
          color: var(--mc-message-status-declined-color);
        }
      }
    }
  }
</style>
