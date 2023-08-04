<!--
  @component
  Preview with info about a file.
-->
<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {byteSizeToHumanReadable} from '~/common/utils/number';
  import {type Message, type MessageBody} from '~/common/viewmodel/types';

  /**
   * The message containing the file to display file info for.
   */
  export let message: Message<MessageBody<'file'>>;

  $: filenameDetails = getSanitizedFileNameDetails({
    name: message.body.filename ?? '',
    type: message.body.mediaType,
  });
</script>

<template>
  <button class="info" class:unnamed={filenameDetails.name === ''} on:click>
    <span class="icon">
      <FileType {filenameDetails} />
    </span>
    <span class="name"
      >{filenameDetails.name === ''
        ? $i18n.t('messaging.label--default-filename', '(no name)')
        : filenameDetails.name}</span
    >
    <span class="size">{byteSizeToHumanReadable(message.body.size)}</span>
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  .info {
    @extend %neutral-input;
    display: grid;
    grid-template:
      'icon name' auto
      'icon size' auto
      / var(--mc-message-file-icon-width) auto;
    column-gap: var(--mc-message-file-info-column-gap);
    row-gap: var(--mc-message-file-info-row-gap);
    justify-items: start;
    cursor: pointer;

    .icon {
      grid-area: icon;
      width: 100%;
      height: 100%;
      font-size: var(--mc-message-file-icon-font-size);
    }

    .name {
      grid-area: name;
      padding: rem(2px) rem(4px);
      margin: rem(-2px) rem(-4px);
      border-radius: rem(2px);
    }

    &.unnamed {
      .name {
        font-style: italic;
      }
    }

    .size {
      grid-area: size;
      @extend %font-small-400;
      color: var(--mc-message-file-size-color);
    }
  }
</style>
