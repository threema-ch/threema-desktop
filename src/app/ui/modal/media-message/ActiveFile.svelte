<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {byteSizeToHumanReadable} from '#3sc/utils/number';
  import FileType from '~/app/ui/modal/media-message/FileType.svelte';

  export let file: File | undefined;

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <div class="container">
    {#if file !== undefined}
      <div class="note">
        {file.name} ({byteSizeToHumanReadable(file.size)})
      </div>
      <div class="type">
        <FileType filename={file.name} />
      </div>
      <div class="options">
        <div class="left" />
        <div class="right">
          <button class="remove-icon" on:click={() => dispatchEvent('remove')}>
            <MdIcon theme="Outlined">delete</MdIcon>
          </button>
        </div>
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    place-items: center;
    position: relative;
    width: 100%;
    height: 100%;

    .note {
      @extend %font-small-400;
      position: absolute;
      top: rem(16px);
      left: rem(20px);
      background-color: var(--cc-media-message-active-file-note-background-color);
      color: var(--cc-media-message-active-file-note-text-color);
      border-radius: rem(4px);
      padding: 0 rem(4px);
    }
    .type {
      width: rem(64px);
      height: rem(80px);
      font-size: rem(16px);
    }
    .options {
      display: grid;
      grid-template: 'left . right';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: rem(56px);
      padding: rem(8px);
      background-color: var(--cc-media-message-active-file-options-background-color);
      color: var(--cc-media-message-active-file-options-text-color);
      user-select: none;
      .left {
        grid-area: left;
        justify-self: start;
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
