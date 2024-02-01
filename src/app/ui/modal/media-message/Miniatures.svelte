<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import FileTrigger from '~/app/ui/svelte-components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {MediaFile, ValidationResult} from '~/app/ui/modal/media-message';
  import Miniature from '~/app/ui/modal/media-message/Miniature.svelte';
  import type {u53} from '~/common/types';

  export let validatedMediaFiles: readonly [mediaFile: MediaFile, result: ValidationResult][];
  export let activeMediaFileIndex: u53;

  /**
   * Whether or not more files can be attached.
   */
  export let moreFilesAttachable: boolean;

  const dispatchEvent = createEventDispatcher<{
    select: MediaFile;
  }>();

  $: [activeMediaFile] = validatedMediaFiles[activeMediaFileIndex] ?? [];
</script>

<template>
  <ul>
    {#each validatedMediaFiles as [mediaFile, validationResult]}
      <li>
        <Miniature
          {mediaFile}
          {validationResult}
          active={mediaFile === activeMediaFile}
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
    align-items: end;
    list-style-type: none;
    overflow-x: scroll;
    padding: 0;
    margin: 0;
  }

  button {
    @include clicktarget-button-circle;
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
