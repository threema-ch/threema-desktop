<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {i18n} from '~/app/ui/i18n';
  import type {MediaFile, ValidationResult} from '~/app/ui/modal/media-message';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import Checkbox from '~/app/ui/svelte-components/blocks/Checkbox/Checkbox.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Image from '~/app/ui/svelte-components/blocks/Image/Image.svelte';
  import {unreachable} from '~/common/utils/assert';
  import {isSupportedImageType} from '~/common/utils/image';
  import {byteSizeToHumanReadable} from '~/common/utils/number';

  export let mediaFile: MediaFile;
  export let validationResult: ValidationResult;

  $: sendAsFile = mediaFile.sendAsFile;

  const dispatchEvent = createEventDispatcher<{remove: undefined}>();
</script>

<template>
  <div class="container">
    <div class="header">
      <span class="chip filename">
        {mediaFile.sanitizedFilenameDetails.name} ({byteSizeToHumanReadable(mediaFile.file.size)})
      </span>
      {#if validationResult.status === 'error'}
        {#each validationResult.reasons as reason}
          <span class="chip error">
            {#if reason === 'fileTooLarge'}
              {$i18n.t('messaging.error--send-file-file-too-large', 'File is too big')}
            {:else if reason === 'captionTooLong'}
              {$i18n.t('messaging.error--send-file-caption-too-long', 'Caption is too long')}
            {:else}
              {unreachable(reason)}
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
      {:else}
        <div class="type">
          <FileType filenameDetails={mediaFile.sanitizedFilenameDetails} />
        </div>
      {/if}
    </div>
    <div class="options">
      <div class="left">
        <div class="send-option">
          {#if isSupportedImageType(mediaFile.file.type)}
            <Checkbox id="send-as-file-checkbox" bind:checked={$sendAsFile} />
            <label class="label" for="send-as-file-checkbox"
              >{$i18n.t(
                'dialog--compose-media-message.label--send-as-file-option',
                'Send as File (Original Size)',
              )}</label
            >
          {/if}
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
