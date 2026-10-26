<script lang="ts">
  import {byteSizeToHumanReadable} from '@threema/ts-utils/conversion/byte-size-to-human-readable';
  import {onDestroy, untrack} from 'svelte';

  import VideoPreview from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/internal/video-preview/VideoPreview.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {MediaFile, ValidationResult} from '~/app/ui/modal/media-message';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import Checkbox from '~/app/ui/svelte-components/blocks/Checkbox/Checkbox.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Image from '~/app/ui/svelte-components/blocks/Image/Image.svelte';
  import {svelteUnreachable, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {isSupportedImageType} from '~/common/utils/image';
  import {isVideoFileType} from '~/common/utils/video';

  interface Props {
    readonly mediaFile: MediaFile;
    readonly onremove?: () => void;
    readonly validationResult: ValidationResult;
  }

  let previewElement = $state<SvelteNullableBinding<HTMLElement>>(null);

  let videoUrl = $state<string | undefined>(undefined);

  $effect(() => {
    untrack(() => {
      if (videoUrl !== undefined) {
        URL.revokeObjectURL(videoUrl);
      }
    });

    if (!isVideoFileType(mediaFile.file.type)) {
      return;
    }

    videoUrl = URL.createObjectURL(mediaFile.file);
  });

  const {mediaFile, onremove, validationResult}: Props = $props();

  const sendAsFile = $derived(mediaFile.sendAsFile);

  onDestroy(() => {
    if (videoUrl !== undefined) {
      URL.revokeObjectURL(videoUrl);
    }
  });
</script>

<template>
  <div class="container">
    <div class="header">
      <span class="chip filename">
        {mediaFile.sanitizedFilenameDetails.name} ({byteSizeToHumanReadable(mediaFile.file.size)})
      </span>
      {#if validationResult.status === 'error'}
        <!-- Key not required because all values are derived from `reason`. -->
        <!-- eslint-disable-next-line svelte/require-each-key -->
        {#each validationResult.reasons as reason}
          <span class="chip error">
            {#if reason === 'fileTooLarge'}
              {$i18n.t('messaging.error--send-file-file-too-large', 'File is too big')}
            {:else if reason === 'captionTooLong'}
              {$i18n.t('messaging.error--send-file-caption-too-long', 'Caption is too long')}
            {:else}
              {svelteUnreachable(reason)}
            {/if}
          </span>
        {/each}
      {/if}
    </div>
    <div class="preview">
      {#if isSupportedImageType(mediaFile.file.type)}
        <Image
          src={mediaFile.file}
          alt={mediaFile.sanitizedFilenameDetails.name}
          draggable={false}
        />
      {:else if isVideoFileType(mediaFile.file.type)}
        <!-- Only if a thumbnail is generated, this is a type that can be handled by media bunny and
        thus be sent as a video.-->
        {#await mediaFile.thumbnail then thumbnail}
          {#if thumbnail !== undefined}
            {#if videoUrl !== undefined}
              <div class="video-preview">
                <VideoPreview
                  bind:element={previewElement}
                  video={{status: 'loaded', type: 'video', url: videoUrl}}
                  options={{
                    autoplay: false,
                    controlslist: 'nofullscreen nodownload noplaybackrate noremoteplayback',
                    loop: false,
                    sizingBehavior: 'stretch',
                  }}
                ></VideoPreview>
              </div>
            {:else}
              <Image
                src={thumbnail.blob}
                alt={mediaFile.sanitizedFilenameDetails.name}
                draggable={false}
              />
            {/if}
          {:else}
            <div class="type">
              <FileType filenameDetails={mediaFile.sanitizedFilenameDetails} />
            </div>
          {/if}
        {/await}
      {:else}
        <div class="type">
          <FileType filenameDetails={mediaFile.sanitizedFilenameDetails} />
        </div>
      {/if}
    </div>
    <div class="options">
      <div class="left">
        <div class="send-option">
          {#if isSupportedImageType(mediaFile.file.type) || isVideoFileType(mediaFile.file.type)}
            {#await mediaFile.thumbnail then thumbnail}
              <!--
              In supported image types, thumbnails are always supported. For videos, we know
              that if the thumbnail was generated, mediabunny supports the type. In that case, we
              want to offer the possibility to send as file. If no thumbnail was generated, the
              video is sent as media file anyway.
               -->
              {#if thumbnail !== undefined}
                <Checkbox id="send-as-file-checkbox" bind:checked={$sendAsFile} />
                <label class="label" for="send-as-file-checkbox">
                  {$i18n.t(
                    'dialog--compose-media-message.label--send-as-file-option',
                    'Send as File (Original Size)',
                  )}
                </label>
              {/if}
            {/await}
          {/if}
        </div>
      </div>
      <div class="right">
        <button class="remove-icon" onclick={onremove}>
          <MdIcon theme="Outlined">delete</MdIcon>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    width: 100%;
    height: 100%;
    grid-template-rows: auto 1fr auto;
    grid-template-columns: auto;

    .header {
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      grid-row: 1 / span 1;
      grid-column: 1 / span 1;
      padding: rem(16px) rem(20px);
      column-gap: rem(4px);
      row-gap: rem(4px);

      .chip {
        @extend %font-small-400;
        background-color: var(--cc-media-message-active-file-chip-background-color);
        color: var(--cc-media-message-active-file-chip-text-color);
        border-radius: rem(4px);
        padding: rem(2px) rem(4px);

        &.error {
          background-color: $alert-red;
          color: white;
        }
      }

      .filename {
        word-break: break-all;
      }
    }

    .preview {
      grid-row: 1 / span 3;

      grid-column: 1 / span 1;
      display: flex;
      justify-content: center;
      align-items: center;

      .video-preview {
        width: 100%;
        height: 100%;

        padding-bottom: rem(56px);
      }

      .type {
        width: rem(64px);
        height: rem(80px);
        font-size: rem(16px);
      }
    }

    .options {
      z-index: 1;
      grid-row: 3 / span 1;
      grid-column: 1 / span 1;
      display: grid;
      grid-template: 'left . right';
      padding: rem(8px);
      background-color: var(--cc-media-message-active-file-options-background-color);
      color: var(--cc-media-message-active-file-options-text-color);
      user-select: none;

      .left {
        grid-area: left;
        justify-self: start;

        .send-option {
          @extend %font-normal-400;
          display: flex;
          align-items: center;
          justify-items: start;
        }
      }

      .right {
        display: grid;
        align-items: center;
        grid-area: right;
        justify-self: end;
        font-size: rem(24px);
      }
    }
  }

  button.remove-icon {
    @include clicktarget-button-circle;

    & {
      border-radius: rem(4px);

      width: rem(40px);
      height: rem(40px);
      display: grid;
      place-items: center;
      cursor: pointer;
    }
  }
</style>
