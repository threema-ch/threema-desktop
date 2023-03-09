<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import FileTrigger from 'threema-svelte-components/src/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';

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
          <div class="type">
            <FileType filenameDetails={mediaFile.sanitizedFilenameDetails} />
          </div>
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

    &:disabled {
      opacity: 1;
    }
  }
  button.file {
    $-file-size: rem(64px);
    min-height: $-file-size;
    min-width: $-file-size;
    background-color: var(--cc-media-message-miniatures-background-color);
    border: none;

    &.active {
      border: solid 2px $consumer-green-600;
      .overlay {
        display: block;
      }
    }
    &:not(.active) {
      cursor: pointer;
    }
  }

  button.add {
    font-size: rem(24px);
    color: var(--t-color-primary);
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

  .type {
    height: rem(40px);
    width: rem(32px);
    font-size: rem(10px);
  }
</style>
