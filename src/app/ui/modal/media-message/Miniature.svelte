<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Image from '#3sc/components/blocks/Image/Image.svelte';
  import {globals} from '~/app/globals';
  import {type MediaFile, type ValidationResult} from '~/app/ui/modal/media-message';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import {isSupportedImageType} from '~/common/utils/image';

  const log = globals.unwrap().uiLogging.logger('ui.component.modal.media-message.miniature');

  export let mediaFile: MediaFile;
  export let validationResult: ValidationResult;

  export let active = false;
  export let disabled = false;

  let thumbnail: Blob | undefined;
  $: {
    mediaFile.thumbnail
      .then((value) => {
        thumbnail = value;
      })
      .catch((error) => {
        log.error(`An error occurred while loading thumbnail: ${error}`);
      });
  }

  const sendAsFile = mediaFile.sendAsFile;
</script>

<template>
  <button on:click class:active disabled={disabled || active} type="button" class="file">
    {#if validationResult.status === 'error'}
      <div class="status invalid">
        <MdIcon theme="Outlined">priority_high</MdIcon>
      </div>
    {/if}
    <div class="overlay" />
    {#if isSupportedImageType(mediaFile.file.type) && thumbnail !== undefined && !$sendAsFile}
      <Image class="thumbnail-image" src={thumbnail} alt={mediaFile.file.name} />
    {:else}
      <div class="type">
        <FileType filenameDetails={mediaFile.sanitizedFilenameDetails} />
      </div>
    {/if}
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  button {
    @include clicktarget-button-circle;
    border-radius: rem(4px);
    margin-top: rem(5px);

    &:disabled {
      opacity: 1;
    }

    .status {
      display: none;

      &.invalid {
        $size: rem(20px);
        $offset: rem(5px);
        z-index: 1;
        display: grid;
        place-items: center;
        position: absolute;
        width: $size;
        height: $size;
        border-radius: calc($size / 2);
        left: calc(100% - $size + $offset);
        top: -$offset;
        color: white;
        background-color: $alert-red;
      }
    }
  }

  button.file {
    $-file-size: rem(64px);
    height: $-file-size;
    width: $-file-size;
    display: flex;
    place-content: center;
    background-color: var(--cc-media-message-miniatures-background-color);
    outline: none;

    &.active {
      $-outline-width: 2px;
      outline-style: solid;
      outline-width: $-outline-width;
      outline-offset: -$-outline-width;
      outline-color: var(--t-color-primary);

      .overlay {
        background-color: var(--t-color-primary);
        opacity: 0.5;
        border-radius: rem(4px);
      }
    }

    &:not(.active) {
      cursor: pointer;
    }

    .overlay {
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      background-color: transparent;
    }

    :global(.thumbnail-image) {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
    }

    .type {
      height: rem(40px);
      width: rem(32px);
      font-size: rem(10px);
    }
  }
</style>
