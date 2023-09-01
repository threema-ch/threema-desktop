<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import {type LoadedImageState} from '~/app/ui/modal/media-message-viewer';

  /**
   * State that provides the image data to preview.
   */
  export let mediaState: LoadedImageState;

  // Allow `null` here due to Svelte sometimes setting binds to null.
  /* eslint-disable @typescript-eslint/ban-types */
  /**
   * The {@link HTMLElement} of the image preview.
   */
  export let element: HTMLElement | null | undefined = undefined;
  /* eslint-enable @typescript-eslint/ban-types */
</script>

<template>
  <img
    bind:this={element}
    on:contextmenu
    src={mediaState.url}
    alt={$i18n.t('dialog--media-message-viewer.hint--image-preview', 'Full-size image preview')}
  />
</template>

<style lang="scss">
  @use 'component' as *;

  img {
    grid-area: 1 / 1;
    border-radius: rem(8px);
    display: block;
    object-fit: contain;
    min-width: rem(16px);
    min-height: rem(16px);
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    background-color: var(--t-main-background-color);
    @extend %elevation-160;
  }
</style>
