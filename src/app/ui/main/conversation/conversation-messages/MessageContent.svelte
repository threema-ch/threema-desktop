<!--
  @component
  Message "payload" content display (e.g. text or image).
-->
<script lang="ts">
  import {onDestroy} from 'svelte/internal';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/generic/form/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type ConversationMessageImageState} from '~/app/ui/main/conversation/conversation-messages';
  import FileMessageContent from '~/app/ui/main/conversation/conversation-messages/message-type/FileMessageContent.svelte';
  import ImageDetail from '~/app/ui/modal/ImageDetail.svelte';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  const log = globals.unwrap().uiLogging.logger(`ui.component.message-content`);

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let message: Message<AnyMessageBody>;

  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

  /**
   * Mentions parsed from the message
   */
  export let mentions: Mention[];

  /**
   * Whether this is a quote display or not.
   */
  export let isQuoted = false;

  let isImageModalVisible = false;
  let thumbnail: ConversationMessageImageState = {
    status: 'loading',
  };

  function handleImageClick(): void {
    if (!isImageModalVisible) {
      isImageModalVisible = true;
    }
  }

  function handleCloseModal(): void {
    if (isImageModalVisible) {
      isImageModalVisible = false;
    }
  }

  function getThumbnail(controller: Remote<ConversationMessageViewModelController>): void {
    controller
      .getThumbnail()
      .then((bytes) => {
        if (thumbnail.status === 'loaded') {
          // Release previous `objectURL`.
          URL.revokeObjectURL(thumbnail.url);
        }

        if (bytes !== undefined) {
          thumbnail = {
            status: 'loaded',
            url: URL.createObjectURL(new Blob([bytes])),
          };
        }
      })
      .catch((error) => {
        log.warn(`Thumbnail couldn't be loaded: ${error}`);
        thumbnail = {
          status: 'failed',
        };
      });
  }

  $: getThumbnail(messageViewModelController);

  onDestroy(() => {
    if (thumbnail.status === 'loaded') {
      URL.revokeObjectURL(thumbnail.url);
    }
  });
</script>

<template>
  <div class="container" class:is-quoted={isQuoted}>
    {#if message.type === 'text'}
      <div class="text">
        <Text text={message.body.text} {mentions} />
      </div>
    {:else if message.type === 'file'}
      <div class="file">
        <FileMessageContent body={message.body} {mentions} on:saveFile />
      </div>
    {:else if message.type === 'image'}
      {#if thumbnail.status === 'loaded'}
        <div class="image" on:click={handleImageClick}>
          <img src={thumbnail.url} alt={message.body.caption ?? 'Image message'} />
        </div>
      {:else}
        <div class="text">
          <Text
            text={$i18n.t(
              'messaging.error--image-message-thumbnail-not-loaded',
              'The image preview could not be loaded.',
            )}
          />
        </div>
      {/if}
    {:else}
      <div class="unsupported-message">
        {$i18n.t('messaging.error--unsupported-message-type', 'Unsupported message type "{type}"', {
          type: message.type,
        })}
      </div>
    {/if}
  </div>

  {#if isImageModalVisible && message.type === 'image'}
    <div class="modal">
      <ImageDetail
        {messageViewModelController}
        dimensions={message.body.dimensions}
        on:close={handleCloseModal}
        on:saveFile
      />
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;

    &.is-quoted {
      .text,
      .unsupported-message {
        opacity: 0.6;
      }
    }

    .image {
      display: grid;
      place-items: center;
      cursor: pointer;
      min-width: rem(120px);
      min-height: rem(120px);

      img {
        display: block;
        border-radius: rem(5px);
        object-fit: contain;
        object-position: center;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 250px;
      }
    }
  }

  .modal {
    position: fixed;
    width: 100vw;
    height: 100vh;
    left: 0;
    top: 0;
    z-index: $z-index-modal;
  }
</style>
