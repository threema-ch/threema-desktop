<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import FileTrigger from '#3sc/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';

  import {type MediaFile} from '.';
  import Miniature from './Miniature.svelte';

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
        <Miniature
          {mediaFile}
          active={activeMediaFile === mediaFile}
          on:click={() => dispatchEvent('select', mediaFile)}
        />
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

  button.add {
    $-file-size: rem(64px);
    height: $-file-size;
    width: $-file-size;
    display: flex;
    place-content: center;
    background-color: var(--cc-media-message-miniatures-background-color);
    outline: none;
    font-size: rem(24px);
    color: var(--t-color-primary);
  }
</style>
