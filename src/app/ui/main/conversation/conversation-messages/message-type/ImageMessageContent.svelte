<!--
  @component
  Image message contents.
-->
<script context="module" lang="ts">
  /**
   * States used to describe the progress when loading a thumbnail image.
   */
  type ConversationMessageImageState =
    | {status: 'loading'}
    | {status: 'failed'}
    | {status: 'loaded'; url: string; dimensions: Dimensions};
</script>

<script lang="ts">
  import {onDestroy} from 'svelte';

  import {globals} from '~/app/globals';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import Text from '~/app/ui/generic/form/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {getExpectedDisplayDimensions} from '~/app/ui/main/conversation/conversation-messages';
  import ImageDetail from '~/app/ui/modal/ImageDetail.svelte';
  import {type Dimensions} from '~/common/types';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';
  import {type Message, type MessageBody} from '~/common/viewmodel/types';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  // Thumbnail render defaults.
  const MIN_THUMBNAIL_DISPLAY_SIZE = 120;
  const MAX_THUMBNAIL_DISPLAY_HEIGHT = 250;
  const QUOTED_THUMBNAIL_DISPLAY_SIZE = 72;

  const log = globals.unwrap().uiLogging.logger(`ui.component.image-message-content`);

  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let message: Message<MessageBody<'image'>>;

  /**
   * Mentions to parse in the message caption.
   */
  export let mentions: Mention[];

  /**
   * Whether this is a quote display or not.
   */
  export let isQuoted = false;

  const thumbnailConstraints = {
    min: {height: MIN_THUMBNAIL_DISPLAY_SIZE},
    max: {height: MAX_THUMBNAIL_DISPLAY_HEIGHT},
  };
  const quotedStyle = `width: ${QUOTED_THUMBNAIL_DISPLAY_SIZE}px;
                       height: ${QUOTED_THUMBNAIL_DISPLAY_SIZE}px;`;

  let isImageModalVisible = false;

  function handleImageClick(): void {
    if (!isImageModalVisible && !isQuoted) {
      isImageModalVisible = true;
    }
  }

  function handleCloseModal(): void {
    if (isImageModalVisible) {
      isImageModalVisible = false;
    }
  }

  function handleContextMenuAction(event: MouseEvent): void {
    event.preventDefault();

    // Prevent ancestor elements from receiving the `contextmenu` event.
    event.stopPropagation();
  }

  function getThumbnail(controller: Remote<ConversationMessageViewModelController>): void {
    controller
      .getThumbnail()
      .then(async (bytes) => {
        if (bytes === undefined) {
          return undefined;
        }
        const blob = new Blob([bytes]);
        const imageBitmap = await createImageBitmap(blob);
        const thumbnail = {
          status: 'loaded',
          dimensions: {
            width: imageBitmap.width,
            height: imageBitmap.height,
          },
          url: URL.createObjectURL(blob),
        } as const;
        imageBitmap.close();
        return thumbnail;
      })
      .then((data) => {
        if (thumbnail.status === 'loaded') {
          // Release previous `objectURL`.
          URL.revokeObjectURL(thumbnail.url);
        }
        if (data !== undefined) {
          thumbnail = data;
        }
      })
      .catch((error) => {
        log.warn(`Thumbnail couldn't be loaded: ${error}`);
        thumbnail = {
          status: 'failed',
        };
      });
  }

  /**
   * The current thumbnail state.
   */
  let thumbnail: ConversationMessageImageState = {
    status: 'loading',
  };
  $: getThumbnail(messageViewModelController);
  $: expectedThumbnailDimensions = getExpectedDisplayDimensions({
    originalDimensions: message.body.dimensions,
    constraints: thumbnailConstraints,
  });
  $: thumbnailDimensions =
    thumbnail.status === 'loaded'
      ? getExpectedDisplayDimensions({
          originalDimensions: thumbnail.dimensions,
          constraints: thumbnailConstraints,
        })
      : undefined;

  onDestroy(() => {
    if (thumbnail.status === 'loaded') {
      URL.revokeObjectURL(thumbnail.url);
    }
  });
</script>

<template>
  <div
    class="container"
    class:is-quoted={isQuoted}
    style={`--c-t-thumbnail-min-size: ${MIN_THUMBNAIL_DISPLAY_SIZE}px;
            --c-t-thumbnail-max-height: ${MAX_THUMBNAIL_DISPLAY_HEIGHT}px;
            --c-t-quoted-thumbnail-size: ${QUOTED_THUMBNAIL_DISPLAY_SIZE}px`}
  >
    {#if thumbnail.status === 'loading'}
      <div class="image">
        <div
          class="placeholder"
          {...expectedThumbnailDimensions === undefined
            ? {}
            : {
                style: isQuoted
                  ? quotedStyle
                  : `width: ${expectedThumbnailDimensions.width}px;
                     height: ${expectedThumbnailDimensions.height}px;`,
              }}
        />
      </div>
    {:else if thumbnail.status === 'loaded' && thumbnailDimensions !== undefined}
      <button class="image" on:click={handleImageClick}>
        <img
          src={thumbnail.url}
          alt={message.body.caption ?? 'Image message'}
          style={isQuoted
            ? quotedStyle
            : `width: ${thumbnailDimensions.width}px; 
               height: ${thumbnailDimensions.height}px;`}
        />
      </button>
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
    {#if message.body.caption !== undefined}
      <div class="text caption">
        <Text text={message.body.caption} {mentions} />
      </div>
    {/if}
    {#if isImageModalVisible}
      <div class="modal" use:contextMenuAction={handleContextMenuAction}>
        <ImageDetail
          {messageViewModelController}
          dimensions={message.body.dimensions}
          on:close={handleCloseModal}
          on:saveFile
        />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-vars: (thumbnail-min-size, thumbnail-max-height, quoted-thumbnail-size);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: rem(8px);

    .image {
      @include clicktarget-button-rect;
      display: grid;
      place-items: center;
      cursor: pointer;
      border-radius: rem(5px);
      overflow: hidden;
      min-width: var($-temp-vars, --c-t-thumbnail-min-size);
      min-height: var($-temp-vars, --c-t-thumbnail-min-size);
      max-width: 100%;

      img {
        display: block;
        object-fit: contain;
        object-position: center;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: var($-temp-vars, --c-t-thumbnail-max-height);
      }
    }

    .text.caption {
      padding: 0 rem(6px) rem(6px);
    }

    &.is-quoted {
      .image {
        cursor: default;
        min-width: var($-temp-vars, --c-t-quoted-thumbnail-size);
        min-height: var($-temp-vars, --c-t-quoted-thumbnail-size);
        width: var($-temp-vars, --c-t-quoted-thumbnail-size);
        height: var($-temp-vars, --c-t-quoted-thumbnail-size);

        img {
          object-fit: cover;
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
  }
</style>
