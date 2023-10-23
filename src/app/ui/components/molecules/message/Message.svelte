<!--
  @component
  Renders a chat message.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Label from '~/app/ui/components/atoms/label/Label.svelte';
  import LazyImage from '~/app/ui/components/atoms/lazy-image/LazyImage.svelte';
  import Prose from '~/app/ui/components/atoms/prose/Prose.svelte';
  import AudioPlayer from '~/app/ui/components/molecules/audio-player/AudioPlayer.svelte';
  import Bubble from '~/app/ui/components/molecules/message/internal/bubble/Bubble.svelte';
  import FileInfo from '~/app/ui/components/molecules/message/internal/file-info/FileInfo.svelte';
  import Indicator from '~/app/ui/components/molecules/message/internal/indicator/Indicator.svelte';
  import Quote from '~/app/ui/components/molecules/message/internal/quote/Quote.svelte';
  import Sender from '~/app/ui/components/molecules/message/internal/sender/Sender.svelte';
  import type {MessageProps} from '~/app/ui/components/molecules/message/props';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {durationToString} from '~/common/utils/date';

  type $$Props = MessageProps;

  export let alt: $$Props['alt'];
  export let content: $$Props['content'] = undefined;
  export let direction: $$Props['direction'];
  export let file: $$Props['file'] = undefined;
  export let onError: $$Props['onError'];
  export let options: NonNullable<$$Props['options']> = {};
  export let quote: $$Props['quote'] = undefined;
  export let reactions: $$Props['reactions'] = undefined;
  export let sender: $$Props['sender'] = undefined;
  export let status: $$Props['status'];
  export let timestamp: $$Props['timestamp'];

  const dispatch = createEventDispatcher<{
    clickthumbnail: undefined;
  }>();

  function handleClickThumbnail(): void {
    dispatch('clickthumbnail');
  }

  function getContentLength(value: typeof content): u53 {
    if (value === undefined) {
      return 0;
    }
    if ('sanitizedHtml' in value) {
      return value.sanitizedHtml.length;
    }

    return value.text.length;
  }

  $: contentLength = getContentLength(content);

  /*
   * Message info placement:
   * - Text message: in footer.
   * - File message:
   *  - ...with caption: in footer.
   *  - ...without caption: embedded in the file preview (e.g. thumbnail).
   */
  $: messageInfoPlacement =
    file !== undefined && content === undefined ? ('preview' as const) : ('footer' as const);
</script>

<Bubble {direction} padding={file?.thumbnail === undefined ? 'normal' : 'thin'}>
  <div class="body">
    {#if options.hideSender !== false && sender !== undefined && direction !== 'outbound'}
      <span class="sender">
        <Sender name={sender.name} color={sender.color} />
      </span>
    {/if}

    {#if quote?.type === 'not-found'}
      <Quote
        {alt}
        content={{
          text: quote.fallbackText,
        }}
        {onError}
      />
    {:else if quote !== undefined}
      <span class="quote">
        <Quote {alt} content={quote.content} file={quote.file} {onError} sender={quote.sender} />
      </span>
    {/if}

    {#if file !== undefined}
      {#if file.type === 'audio'}
        <span class="audio">
          <AudioPlayer duration={file.duration} fetchAudio={file.fetchFilePayload} {onError}>
            <svelte:fragment slot="footer" let:duration>
              <span class="footer">
                <span class="size">
                  <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-argument -->
                  <Label text={durationToString(duration ?? 0)} wrap={false} />
                </span>
                {#if messageInfoPlacement === 'preview'}
                  <span class="status">
                    <Label text={timestamp} wrap={false} />
                    <Indicator {direction} hideStatus={options.hideStatus} {reactions} {status} />
                  </span>
                {/if}
              </span>
            </svelte:fragment>
          </AudioPlayer>
        </span>
      {:else if file.type === 'file'}
        <span class="file">
          <FileInfo mediaType={file.mediaType} name={file.name} sizeInBytes={file.sizeInBytes}>
            <svelte:fragment slot="status">
              {#if messageInfoPlacement === 'preview'}
                <Label text={timestamp} wrap={false} />
                <Indicator {direction} hideStatus={options.hideStatus} {reactions} {status} />
              {/if}
            </svelte:fragment>
          </FileInfo>
        </span>
      {:else if file.type === 'image' || file.type === 'video'}
        <span class="thumbnail">
          {#if file.type === 'video' && options.hideVideoPlayButton !== true}
            <button class="play-button" on:click={handleClickThumbnail}>
              <MdIcon theme="Filled">play_arrow</MdIcon>
            </button>
          {/if}

          <LazyImage
            bytes={file.thumbnail?.fetchThumbnailPayload() ?? Promise.resolve(undefined)}
            constraints={{
              min: {
                // Dynamically increase the min width for longer text.
                width: Math.min(125 + contentLength, 180),
                height: 70,
                size: 16384,
              },
              max: {
                width: 384,
                height: 384,
                size: 65536,
              },
            }}
            description={alt}
            dimensions={file.thumbnail?.expectedDimensions}
            disabled={false}
            on:click={handleClickThumbnail}
          />
        </span>
      {:else}
        {unreachable(file.type)}
      {/if}
    {/if}

    {#if content !== undefined}
      <div class="text">
        <Prose {content} selectable={true} wrap={true} />
      </div>
    {/if}

    {#if messageInfoPlacement === 'footer'}
      <div class="footer">
        <span class="status">
          <Label text={timestamp} wrap={false} />
          <Indicator {direction} hideStatus={options.hideStatus} {reactions} {status} />
        </span>
      </div>
    {/if}
  </div>
</Bubble>

<style lang="scss">
  @use 'component' as *;

  .body {
    position: relative;
    display: flex;
    align-items: start;
    justify-content: start;
    flex-direction: column;

    .sender {
      // If `.sender` is a general-preceding sibling of `.thumbnail`.
      &:has(~ .thumbnail) {
        padding: rem(1px) rem(8px) rem(2px);
      }
    }

    .text {
      @extend %font-normal-400;
    }

    // If `.text` is a general-subsequent sibling of `.thumbnail`.
    .thumbnail ~ .text {
      padding: rem(8px) rem(8px) rem(0px);

      // Prevent text from growing larger than the thumbnail.
      width: min-content;
      min-width: 100%;
    }

    .quote {
      padding-bottom: rem(4px);
    }

    .audio {
      .footer {
        @extend %font-small-400;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 100%;
        gap: rem(8px);
        color: var(--mc-message-file-size-color);
      }
    }

    .thumbnail {
      position: relative;
      border-radius: rem(10px);
      overflow: hidden;

      .play-button {
        @include clicktarget-button-circle;
        display: flex;
        position: absolute;
        justify-content: center;
        align-items: center;
        color: var(--mc-message-overlay-button-color);
        background-color: var(--mc-message-overlay-button-background-color);
        width: rem(44px);
        height: rem(44px);
        left: calc(50% - rem(22px));
        top: calc(50% - rem(22px));
        font-size: rem(24px);

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

    .footer {
      width: 100%;
      display: grid;

      .status {
        @include def-var(--c-icon-font-size, var(--mc-message-indicator-icon-size));
        justify-self: end;
        display: flex;
        align-items: center;
        gap: var(--mc-message-indicator-column-gap);
        color: var(--mc-message-indicator-label);
        @extend %font-small-400;
      }
    }

    .thumbnail ~ .text ~ .footer {
      padding: rem(0px) rem(10px) rem(8px);
    }
  }
</style>
