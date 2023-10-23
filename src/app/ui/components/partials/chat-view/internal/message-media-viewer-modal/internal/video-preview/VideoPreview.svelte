<!--
  @component
  Renders a preview of a video message blob.
-->
<script lang="ts">
  import type {VideoPreviewProps} from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/internal/video-preview/props';

  type $$Props = VideoPreviewProps;

  export let element: $$Props['element'] = null;
  export let video: $$Props['video'];
</script>

<!-- Ignore Svelte video captions warning, as video captions are not supported in the Threema
protocol. -->
<!-- svelte-ignore a11y-media-has-caption -->
<video
  bind:this={element}
  src={video.url}
  controls
  controlslist="nodownload"
  autoplay
  loop
  on:contextmenu
/>

<style lang="scss">
  @use 'component' as *;

  video {
    @extend %elevation-160;
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

    &:focus-visible {
      outline: none;
    }
  }
</style>
