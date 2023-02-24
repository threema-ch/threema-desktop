<!--
  @component
  File message contents.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {byteSizeToHumanReadable} from '#3sc/utils/number';
  import Text from '~/app/ui/generic/form/Text.svelte';
  import {getFileExtension} from '~/app/ui/modal/media-message';
  import {type MessageBodyFor} from '~/common/viewmodel/types';

  export let body: MessageBodyFor<'file'>;

  const dispatch = createEventDispatcher<{saveFile: undefined}>();

  const extension = body.filename !== undefined ? getFileExtension(body.filename) : 'FILE';
</script>

<template>
  <div class="info" data-name={body.filename !== undefined}>
    <!-- Note: Since the filename is already a button, accessibilty / tabbability for file download
    is already covered and we can ignore this warning. -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="icon" on:click={() => dispatch('saveFile')}>
      <div class="ext">{extension}</div>
    </div>
    {#if body.filename !== undefined}
      <button class="name" on:click={() => dispatch('saveFile')}>{body.filename}</button>
    {/if}
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
      'icon size' auto
      'icon .' auto
      / var(--mc-message-file-icon-width) auto;
    grid-column-gap: var(--mc-message-file-info-column-gap);
    grid-row-gap: var(--mc-message-file-info-row-gap);
    justify-items: start;

    &[data-name='true'] {
      grid-template:
        'icon name' auto
        'icon size' auto
        / var(--mc-message-file-icon-width) auto;
    }

    .icon {
      grid-area: icon;
      width: var(--mc-message-file-icon-width);
      height: var(--mc-message-file-icon-height);
      background-image: var(--mc-message-file-icon-background-image);
      background-size: contain;
      background-repeat: no-repeat;
      overflow: hidden;
      text-transform: uppercase;
      display: grid;
      place-items: center;
      color: var(--mc-message-file-icon-font-color);
      user-select: none;
      cursor: pointer;

      .ext {
        font-size: var(--mc-message-file-icon-font-size);
      }
    }

    .name {
      @include square-button;
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
