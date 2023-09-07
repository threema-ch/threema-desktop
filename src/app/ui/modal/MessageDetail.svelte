<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import DateTime from '~/app/ui/generic/form/DateTime.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import Divider from '~/app/ui/nav/receiver/detail/Divider.svelte';
  import ListElement from '~/app/ui/nav/receiver/detail/ListElement.svelte';
  import {
    ImageRenderingTypeUtils,
    MessageDirection,
    MessageDirectionUtils,
    MessageReaction,
    MessageReactionUtils,
  } from '~/common/enum';
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
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <TitleAndClose
        let:modal
        {modal}
        slot="header"
        title={$i18n.t('dialog--message-details.label--title', 'Message Details')}
      />
      <div class="body" slot="body">
        <ListElement label={$i18n.t('dialog--message-details.label--created-date', 'Created')}>
          <DateTime date={message.view.createdAt} format="extended" />
        </ListElement>
        {#if message.ctx === MessageDirection.INBOUND}
          <ListElement label={$i18n.t('dialog--message-details.label--received-date', 'Received')}
            ><DateTime date={message.view.receivedAt} format="extended" /></ListElement
          >
        {/if}
        {#if message.ctx === MessageDirection.OUTBOUND}
          <ListElement label={$i18n.t('dialog--message-details.label--sent-date', 'Sent')}>
            {#if message.view.sentAt === undefined}
              -
            {:else}
              <DateTime date={message.view.sentAt} format="extended" />
            {/if}
          </ListElement>
          <ListElement label={$i18n.t('dialog--message-details.label--delivered-date', 'Delivered')}
            >{#if message.view.deliveredAt === undefined}
              -
            {:else}
              <DateTime date={message.view.deliveredAt} format="extended" />
            {/if}</ListElement
          >
        {/if}
        <ListElement label={$i18n.t('dialog--message-details.label--read-date', 'Read')}
          >{#if message.view.readAt === undefined}
            -
          {:else}
            <DateTime date={message.view.readAt} format="extended" />
          {/if}</ListElement
        >
        <Divider />
        <ListElement label={$i18n.t('dialog--message-details.label--message-id', 'Message ID')}
          >{u64ToHexLe(message.view.id)}</ListElement
        >
        <Divider />
        <ListElement
          label={$i18n.t('dialog--message-details.label--last-reaction', 'Last Reaction')}
        >
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
        {#if import.meta.env.DEBUG || import.meta.env.BUILD_ENVIRONMENT === 'sandbox'}
          <Divider />
          <ListElement label="Debug Info 🐞">
            ℹ️ This section is only shown in DEBUG and SANDBOX builds.
          </ListElement>
          <ListElement label="Direction">
            {MessageDirectionUtils.nameOf(message.view.direction)?.toLowerCase()}
          </ListElement>
          {#if message.type === 'file' || message.type === 'image' || message.type === 'video' || message.type === 'audio'}
            <ListElement label="File Message Data State">
              {message.view.state}
            </ListElement>
            <ListElement label="File Size">
              {(message.view.fileSize / 1024).toFixed(0)} KiB (reported){#if message.view.fileData !== undefined},
                {(message.view.fileData.unencryptedByteCount / 1024).toFixed(0)} KiB (actual){/if}
            </ListElement>
            <ListElement label="Thumbnail Size">
              {#if message.view.thumbnailFileData !== undefined}
                {(message.view.thumbnailFileData.unencryptedByteCount / 1024).toFixed(0)} KiB (actual)
              {:else}
                undefined
              {/if}
            </ListElement>
            <ListElement label="Correlation ID">
              {message.view.correlationId}
            </ListElement>
            <ListElement label="Media Types">
              File: {message.view.mediaType}, Thumbnail: {message.view.thumbnailMediaType}
            </ListElement>
          {/if}
          {#if message.type === 'image'}
            <ListElement label="Image Rendering Type">
              {ImageRenderingTypeUtils.nameOf(message.view.renderingType)?.toLowerCase()}
            </ListElement>
            <ListElement label="Animated">
              {message.view.animated}
            </ListElement>
          {/if}
          {#if message.type === 'video' || message.type === 'audio'}
            <ListElement label="Duration">
              {#if message.view.duration}
                {message.view.duration} s
              {:else}
                undefined
              {/if}
            </ListElement>
          {/if}
          {#if message.type === 'image' || message.type === 'video'}
            <ListElement label="Dimensions">
              {#if message.view.dimensions}
                {message.view.dimensions.width}x{message.view.dimensions.height}
              {:else}
                undefined
              {/if}
            </ListElement>
          {/if}
        {/if}
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
