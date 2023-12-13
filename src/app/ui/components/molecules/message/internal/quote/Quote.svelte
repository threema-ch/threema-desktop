<!--
  @component
  Renders a message quote.
-->
<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import LazyImage from '~/app/ui/components/atoms/lazy-image/LazyImage.svelte';
  import Prose from '~/app/ui/components/atoms/prose/Prose.svelte';
  import AudioPlayer from '~/app/ui/components/molecules/audio-player/AudioPlayer.svelte';
  import FileInfo from '~/app/ui/components/molecules/message/internal/file-info/FileInfo.svelte';
  import type {QuoteProps} from '~/app/ui/components/molecules/message/internal/quote/props';
  import Sender from '~/app/ui/components/molecules/message/internal/sender/Sender.svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = QuoteProps;

  export let alt: $$Props['alt'];
  export let content: $$Props['content'] = undefined;
  export let clickable: NonNullable<$$Props['clickable']> = false;
  export let file: $$Props['file'] = undefined;
  export let onError: $$Props['onError'];
  export let sender: $$Props['sender'] = undefined;
</script>

<button
  class={`quote ${sender?.color ?? 'default'} ${
    file === undefined ? '' : `${file.type}-container`
  }`}
  class:captioned={content !== undefined}
  disabled={!clickable}
  on:click
>
  {#if sender !== undefined}
    <span class="sender">
      <Sender name={sender.name} color={sender.color} />
    </span>
  {/if}

  {#if file !== undefined}
    {#if file.type === 'audio'}
      <span class="audio">
        <AudioPlayer duration={file.duration} fetchAudio={file.fetchFileBytes} {onError} />
      </span>
    {:else if file.type === 'file'}
      <span class="file">
        <FileInfo
          mediaType={file.mediaType}
          name={file.name}
          sizeInBytes={file.sizeInBytes}
          disabled={!clickable}
        />
      </span>
    {:else if file.type === 'image' || file.type === 'video'}
      {#if file.thumbnail !== undefined}
        <span class="thumbnail">
          {#if file.type === 'video'}
            <div class="play-icon">
              <MdIcon theme="Filled">play_arrow</MdIcon>
            </div>
          {/if}

          <LazyImage
            byteStore={file.thumbnail.blobStore}
            constraints={{
              min: {
                width: 40,
                height: 40,
              },
              max: {
                width: 40,
                height: 40,
              },
            }}
            description={alt}
            dimensions={file.thumbnail.expectedDimensions}
            disabled={!clickable}
          />
        </span>
      {:else}
        <!-- If no thumbnail is given (which shouldn't happen in practice), simply don't render
        anything. -->
      {/if}
    {:else}
      {unreachable(file.type)}
    {/if}
  {/if}

  {#if content !== undefined}
    <div class="text">
      <Prose {content} wrap={true} selectable={true} />
    </div>
  {/if}
</button>

<style lang="scss">
  @use 'component' as *;

  .quote {
    @extend %neutral-input;
    text-align: start;

    position: relative;
    display: grid;
    grid-template:
      'sender' min-content
      'preview' 1fr
      / auto;
    align-items: center;
    column-gap: rem(24px);
    row-gap: 0;
    min-height: rem(40px);
    padding-left: rem(10px);
    width: 100%;

    &.captioned {
      grid-template:
        'sender preview' min-content
        'text preview' 1fr
        / auto min-content;

      &.audio-container,
      &.file-container {
        grid-template:
          'sender' min-content
          'preview' 1fr
          'text' min-content
          / auto;
        row-gap: rem(4px);
      }

      .text {
        grid-area: text;
        display: flex;
        align-items: center;
        justify-content: start;
        color: var(--mc-message-quote-text-color);
      }
    }

    &:before {
      content: '';
      position: absolute;
      display: block;
      left: 0;
      top: rem(5px);
      width: var(--mc-message-quote-border-width);
      height: calc(100% - rem(10px));
      border-radius: calc(var(--mc-message-quote-border-width) / 2);
      // Default quote bar is the same as the text color.
      background-color: var(--mc-message-quote-text-color);
    }

    .sender {
      grid-area: sender;
      line-height: 1em;
    }

    .thumbnail {
      position: relative;
      grid-area: preview;
      width: min-content;
      height: min-content;
      border-radius: rem(8px);
      overflow: hidden;

      .play-icon {
        @include clicktarget-button-circle;
        pointer-events: none;
        display: flex;
        position: absolute;
        justify-content: center;
        align-items: center;
        color: var(--mc-message-overlay-button-color);
        background-color: var(--mc-message-overlay-button-background-color);
        width: rem(22px);
        height: rem(22px);
        left: calc(50% - rem(11px));
        top: calc(50% - rem(11px));
        font-size: rem(12px);

        --c-icon-button-naked-outer-background-color--hover: var(
          --mc-message-overlay-button-background-color--hover
        );
        --c-icon-button-naked-outer-background-color--focus: var(
          --mc-message-overlay-button-background-color--focus
        );
        --c-icon-button-naked-outer-background-color--active: var(
          --mc-message-overlay-button-background-color--active
        );
      }
    }

    .audio {
      grid-area: preview;
    }

    &:not(.captioned) {
      .thumbnail,
      .audio {
        margin: rem(4px) 0;
      }
    }

    &:not(:disabled),
    &:global(:not(:disabled) *) {
      cursor: pointer;
    }
  }

  @each $color in map-get-req($config, profile-picture-colors) {
    .quote.#{$color} {
      &:before {
        background-color: var(--c-profile-picture-initials-#{$color}, default);
      }
    }
  }
</style>
