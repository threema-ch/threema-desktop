<script lang="ts">
  import Image from '#3sc/components/blocks/Image/Image.svelte';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import {getUtf8ByteLength} from '~/common/utils/string';

  import {MAX_CAPTION_BYTE_LENGTH, type MediaFile} from '.';

  export let mediaFile: MediaFile;

  export let active = false;
  export let disabled = false;

  $: caption = mediaFile.caption;
  $: invalid =
    $caption !== undefined ? getUtf8ByteLength($caption) > MAX_CAPTION_BYTE_LENGTH : false;
</script>

<template>
  <button
    on:click
    class:active
    class:invalid
    disabled={disabled || active}
    type="button"
    class="file"
  >
    <div class="overlay" />
    {#if mediaFile.file.type.startsWith('image/')}
      <Image class="thumbnail-image" src={mediaFile.file} alt={mediaFile.file.name} />
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
    @include circle-button;
    border-radius: rem(4px);
    overflow: hidden;

    &:disabled {
      opacity: 1;
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

    &.active,
    &.invalid {
      $-outline-width: 2px;
      outline-style: solid;
      outline-width: $-outline-width;
      outline-offset: -$-outline-width;
    }

    &.invalid {
      outline-color: $alert-red;
    }

    &.active {
      outline-color: $consumer-green-600;

      .overlay {
        background-color: rgba($consumer-green-600, 0.5);
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
