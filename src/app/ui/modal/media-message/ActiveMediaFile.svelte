<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Checkbox from '#3sc/components/blocks/Checkbox/Checkbox.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Image from '#3sc/components/blocks/Image/Image.svelte';
  import {type MediaFile} from '~/app/ui/modal/media-message';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import {byteSizeToHumanReadable} from '~/common/utils/number';

  export let mediaFile: MediaFile;

  const dispatchEvent = createEventDispatcher<{remove: undefined}>();
</script>

<template>
  <div class="container">
    <div class="header">
      <span class="chip">
        {mediaFile.sanitizedFilenameDetails.name} ({byteSizeToHumanReadable(mediaFile.file.size)})
      </span>
    </div>
    <div class="preview">
      {#if mediaFile.file.type.startsWith('image/')}
        <Image
          src={mediaFile.file}
          alt={mediaFile.sanitizedFilenameDetails.name}
          draggable={false}
        />
      {:else}
        <div class="type">
          <FileType filenameDetails={mediaFile.sanitizedFilenameDetails} />
        </div>
      {/if}
    </div>
    <div class="options">
      <div class="left">
        <div class="send-option wip">
          <!-- Hardcoded for now, as file can currently only be sent as file -->
          <Checkbox id="send-as-file-checkbox" checked={true} disabled={true} />
          <label class="label wip" for="send-as-file-checkbox">Send as File (Original Size)</label>
        </div>
      </div>
      <div class="right">
        <button class="remove-icon" on:click={() => dispatchEvent('remove')}>
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
      grid-row: 1 / span 1;
      grid-column: 1 / span 1;
      padding: rem(16px) rem(20px);

      .chip {
        @extend %font-small-400;
        background-color: var(--cc-media-message-active-file-chip-background-color);
        color: var(--cc-media-message-active-file-chip-text-color);
        border-radius: rem(4px);
        padding: rem(2px) rem(4px);
      }
    }

    .preview {
      grid-row: 1 / span 3;
      grid-column: 1 / span 1;
      display: flex;
      justify-content: center;
      align-items: center;

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
    @include circle-button;
    border-radius: rem(4px);

    width: rem(40px);
    height: rem(40px);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
</style>
