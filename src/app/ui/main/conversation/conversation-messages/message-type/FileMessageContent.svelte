<!--
  @component
  File message contents.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/generic/form/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';
  import {type FilenameDetails, getSanitizedFileNameDetails} from '~/common/utils/file';
  import {byteSizeToHumanReadable} from '~/common/utils/number';
  import {type MessageBodyFor} from '~/common/viewmodel/types';

  export let body: MessageBodyFor<'file'>;

  const dispatch = createEventDispatcher<{saveFile: undefined}>();

  let filenameDetails: FilenameDetails;

  $: if (body !== undefined) {
    filenameDetails = getSanitizedFileNameDetails({
      name: body.filename ?? '',
      type: body.mediaType,
    });
  }
</script>

<template>
  <div class="info" data-has-name={filenameDetails.name !== ''}>
    <!-- Note: Since the filename is already a button, accessibility / tabbability for file download
    is already covered and we can ignore this warning. -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="icon" on:click={() => dispatch('saveFile')}>
      <FileType {filenameDetails} />
    </div>
    <button class="name" on:click={() => dispatch('saveFile')}
      >{filenameDetails.name !== ''
        ? filenameDetails.name
        : $i18n.t('topic.messaging.undefined-file-name', '(no name)')}</button
    >
    <div class="size">{byteSizeToHumanReadable(body.size)}</div>
  </div>
  {#if body.caption !== undefined}
    <div class="caption">
      <Text text={body.caption} />
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .caption {
    margin-top: var(--mc-message-file-info-column-gap);
  }

  .info {
    display: grid;
    grid-template:
      'icon name' auto
      'icon size' auto
      / var(--mc-message-file-icon-width) auto;
    column-gap: var(--mc-message-file-info-column-gap);
    row-gap: var(--mc-message-file-info-row-gap);
    justify-items: start;

    &[data-has-name='false'] {
      button {
        font-style: italic;
      }
    }

    .icon {
      grid-area: icon;
      width: 100%;
      height: 100%;
      font-size: var(--mc-message-file-icon-font-size);
    }

    .name {
      @include clicktarget-button-rect;
      grid-area: name;
      padding: rem(2px) rem(4px);
      margin: rem(-2px) rem(-4px);
      border-radius: rem(2px);
      --c-icon-button-naked-outer-background-color--hover: none;
      --c-icon-button-naked-outer-background-color--focus: none;
      --c-icon-button-naked-outer-background-color--active: none;
    }

    .size {
      grid-area: size;
      @extend %font-small-400;
      color: var(--mc-message-file-size-color);
    }
  }
</style>
