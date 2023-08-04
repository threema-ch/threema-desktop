<!--
  @component
  Image used as part of a message.
-->
<script context="module" lang="ts">
  /**
   * States used to describe the progress when loading a thumbnail image.
   */
  type ThumbnailState =
    | {status: 'loading'}
    | {status: 'failed'}
    | {
        status: 'loaded';
        url: string;
        dimensions: Dimensions;
      };
</script>

<script lang="ts">
  import {onDestroy} from 'svelte';
  import {type Writable, writable} from 'svelte/store';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import {i18n} from '~/app/ui/i18n';
  import {
    type Constraints,
    getConstrainedImageDimensions,
    type ImageDisplayProposal,
  } from '~/app/ui/main/conversation/conversation-messages/content-fragment';
  import {type Dimensions} from '~/common/types';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';
  import {type Message, type MessageBody} from '~/common/viewmodel/types';

  const log = globals
    .unwrap()
    .uiLogging.logger(`ui.component.conversation-message.content-fragment.image`);

  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let message: Message<MessageBody<'image'>>;

  /**
   * Size constraints to control the thumbnail's display.
   */
  export let constraints: Constraints;

  /**
   * Whether the image is clickable.
   */
  export let isClickable = true;

  const thumbnailStore: Writable<ThumbnailState> = writable({status: 'loading'});

  function fetchThumbnail({
    controller,
  }: {
    controller: Remote<ConversationMessageViewModelController>;
  }): void {
    controller
      .getThumbnail()
      .then(async (bytes) => {
        if (bytes === undefined) {
          throw new Error("Didn't receive any bytes");
        }

        const blob = new Blob([bytes]);
        const imageBitmap = await createImageBitmap(blob);
        const state = {
          status: 'loaded',
          dimensions: {
            width: imageBitmap.width,
            height: imageBitmap.height,
          },
          url: URL.createObjectURL(blob),
        } as const;

        imageBitmap.close();

        return state;
      })
      .then((state) => {
        // Release previous `objectURL`.
        if ($thumbnailStore.status === 'loaded') {
          URL.revokeObjectURL($thumbnailStore.url);
        }

        thumbnailStore.set({
          ...state,
        });
      })
      .catch((error) => {
        log.warn(`Thumbnail couldn't be loaded: ${error}`);

        thumbnailStore.set({
          status: 'failed',
        });
      });
  }

  function getPreferredDisplay({
    thumbnail,
    constraints: displayConstraints,
    naturalDimensions,
  }: {
    thumbnail: ThumbnailState;
    constraints: Constraints;
    naturalDimensions: Dimensions | undefined;
  }): ImageDisplayProposal {
    if (thumbnail.status === 'loaded') {
      return getConstrainedImageDimensions({
        naturalDimensions: thumbnail.dimensions,
        constraints: displayConstraints,
      });
    }

    if (naturalDimensions !== undefined) {
      return getConstrainedImageDimensions({
        naturalDimensions,
        constraints: displayConstraints,
      });
    }

    return {
      constrainedSize: {width: 160, height: 160},
      isAspectRatioObeyed: false,
      orientation: 'none',
    };
  }

  /**
   * Current thumbnail state.
   */
  $: fetchThumbnail({
    controller: messageViewModelController,
  });

  /**
   * Preferred size to display the thumbnail at. Uses the extracted size of the image blob if
   * available, or the thumbnail's reported size.
   */
  $: preferredDisplay = getPreferredDisplay({
    thumbnail: $thumbnailStore,
    constraints,
    naturalDimensions: message.body.dimensions,
  });

  onDestroy(() => {
    if ($thumbnailStore.status === 'loaded') {
      URL.revokeObjectURL($thumbnailStore.url);
    }
  });
</script>

<template>
  <span
    class="container"
    style={`--c-t-thumbnail-aspect-ratio: ${preferredDisplay.constrainedSize.width} / ${preferredDisplay.constrainedSize.height};
            --c-t-thumbnail-min-width: ${constraints.min.width}px;
            --c-t-thumbnail-min-height: ${constraints.min.height}px;
            --c-t-thumbnail-width: ${preferredDisplay.constrainedSize.width}px;
            --c-t-thumbnail-height: ${preferredDisplay.constrainedSize.height}px;
            --c-t-thumbnail-max-width: ${constraints.max.width}px;
            --c-t-thumbnail-max-height: ${constraints.max.height}px;`}
  >
    <button class="image" on:click>
      {#if $thumbnailStore.status === 'loading'}
        <span class="placeholder" />
      {:else if $thumbnailStore.status === 'loaded'}
        <img
          class:cover={!preferredDisplay.isAspectRatioObeyed}
          src={$thumbnailStore.url}
          alt={message.body.caption ?? $i18n.t('messaging.hint--image-message', 'Image message')}
        />
      {:else if $thumbnailStore.status === 'failed'}
        <span class="placeholder failed">
          <MdIcon theme="Filled">broken_image</MdIcon>
        </span>
      {/if}
    </button>
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  $-vars: (
    thumbnail-aspect-ratio,
    thumbnail-min-width,
    thumbnail-min-height,
    thumbnail-width,
    thumbnail-height,
    thumbnail-max-width,
    thumbnail-max-height
  );
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    display: inline-flex;
    aspect-ratio: var($-temp-vars, --c-t-thumbnail-aspect-ratio);

    .image {
      @extend %neutral-input;
      cursor: pointer;
      min-width: var($-temp-vars, --c-t-thumbnail-min-width);
      max-width: var($-temp-vars, --c-t-thumbnail-max-width);

      img,
      .placeholder {
        display: inline-block;
        border-radius: rem(5px);
        background-color: var(--mc-message-image-placeholder-background-color);

        min-width: 100%;
        min-height: 100%;
        width: var($-temp-vars, --c-t-thumbnail-width);
        max-width: 100%;
        max-height: var($-temp-vars, --c-t-thumbnail-height);

        // Reset bottom gap.
        vertical-align: middle;
      }

      img {
        object-fit: contain;
        object-position: center;

        &.cover {
          object-fit: cover;
        }
      }

      .placeholder {
        &.failed {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: rem(24px);
        }
      }
    }

    &:not(.clickable) {
      .image {
        cursor: unset;
      }
    }
  }
</style>
