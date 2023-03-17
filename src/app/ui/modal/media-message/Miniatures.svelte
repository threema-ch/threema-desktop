<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import FileTrigger from '#3sc/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Image from '#3sc/components/blocks/Image/Image.svelte';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';

  import {type MediaFile} from '.';

  export let mediaFiles: MediaFile[];
  export let activeMediaFile: MediaFile | undefined;

  /**
   * Whether or not more files can be attached.
   */
  export let moreFilesAttachable: boolean;

  const dispatchEvent = createEventDispatcher<{
    select: MediaFile;
  }>();
</script>

<template>
  <ul>
    {#each mediaFiles as mediaFile}
      <li>
        <button
          class:active={activeMediaFile === mediaFile}
          disabled={activeMediaFile === mediaFile}
          type="button"
          class="file"
          on:click={() => dispatchEvent('select', mediaFile)}
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
      </li>
    {/each}

    {#if moreFilesAttachable}
      <FileTrigger multiple on:fileDrop>
        <li>
          <button type="button" class="file add">
            <MdIcon theme="Outlined">add</MdIcon>
          </button>
        </li>
      </FileTrigger>
    {/if}
  </ul>
</template>

<style lang="scss">
  @use 'component' as *;

  ul {
    display: flex;
    flex-direction: row;
    column-gap: rem(8px);
    list-style-type: none;
    overflow-x: scroll;
    padding: 0;
    margin: 0;
  }

  li {
    display: grid;
    place-items: center;
    position: relative;
  }

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

    &.active {
      $-outline-width: 2px;
      outline: solid $-outline-width $consumer-green-600;
      outline-offset: -$-outline-width;
      .overlay {
        display: block;
      }
    }

    &:not(.active) {
      cursor: pointer;
    }

    .overlay {
      display: none;
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      background-color: rgba($consumer-green-600, 0.5);
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

  button.add {
    font-size: rem(24px);
    color: var(--t-color-primary);
  }
</style>
