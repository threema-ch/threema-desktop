<script lang="ts">
  import {type LoadedVideoState} from '~/app/ui/modal/media-message-viewer';

  /**
   * State that provides the video data to preview.
   */
  export let mediaState: LoadedVideoState;

  // Allow `null` here due to Svelte sometimes setting binds to null.
  /* eslint-disable @typescript-eslint/ban-types */
  /**
   * The {@link HTMLElement} of the image preview.
   */
  export let element: HTMLElement | null | undefined = undefined;
  /* eslint-enable @typescript-eslint/ban-types */
</script>

<template>
  <!-- Ignore Svelte video captions warning, as video captions are not supported in the Threema
    protocol. -->
  <!-- svelte-ignore a11y-media-has-caption -->
  <video
    bind:this={element}
    src={mediaState.url}
    controls
    controlslist="nodownload"
    autoplay
    loop
    on:contextmenu
  />
</template>

<style lang="scss">
  @use 'component' as *;

  video {
    grid-area: 1 / 1;
    border-radius: rem(8px);
    display: block;
    object-fit: contain;
    min-width: rem(160px);
    min-height: rem(160px);
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    background-color: var(--t-main-background-color);
    @extend %elevation-160;

    &:focus-visible {
      outline: none;
    }
  }
</style>
