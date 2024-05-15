<!--
  @component
  Renders a chat message.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import LazyImage from '~/app/ui/components/atoms/lazy-image/LazyImage.svelte';
  import Prose from '~/app/ui/components/atoms/prose/Prose.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import AudioPlayer from '~/app/ui/components/molecules/audio-player/AudioPlayer.svelte';
  import Bubble from '~/app/ui/components/molecules/message/internal/bubble/Bubble.svelte';
  import FileInfo from '~/app/ui/components/molecules/message/internal/file-info/FileInfo.svelte';
  import Indicator from '~/app/ui/components/molecules/message/internal/indicator/Indicator.svelte';
  import Quote from '~/app/ui/components/molecules/message/internal/quote/Quote.svelte';
  import Sender from '~/app/ui/components/molecules/message/internal/sender/Sender.svelte';
  import type {MessageProps} from '~/app/ui/components/molecules/message/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {MAX_CONVERSATION_THUMBNAIL_SIZE} from '~/common/dom/ui/media';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {durationToString} from '~/common/utils/date';
  import {hasProperty} from '~/common/utils/object';

  type $$Props = MessageProps;

  export let alt: $$Props['alt'];
  export let clickable: NonNullable<$$Props['clickable']> = false;
  export let content: $$Props['content'] = undefined;
  export let direction: $$Props['direction'];
  export let file: $$Props['file'] = undefined;
  export let highlighted: $$Props['highlighted'] = undefined;
  export let lastEdited: $$Props['lastEdited'] = undefined;
  export let onError: $$Props['onError'];
  export let options: NonNullable<$$Props['options']> = {};
  export let quote: $$Props['quote'] = undefined;
  export let reactions: $$Props['reactions'];
  export let sender: $$Props['sender'] = undefined;
  export let status: $$Props['status'];
  export let timestamp: $$Props['timestamp'];

  const dispatch = createEventDispatcher<{
    clickfileinfo: undefined;
    clickquote: undefined;
    clickthumbnail: undefined;
  }>();

  function handleClickQuote(): void {
    dispatch('clickquote');
  }

  function handleClickFileInfo(): void {
    dispatch('clickfileinfo');
  }

  function handleClickThumbnail(): void {
    dispatch('clickthumbnail');
  }

  function getContentLength(value: typeof content): u53 {
    if (value === undefined) {
      return 0;
    }
    if (hasProperty(value, 'sanitizedHtml')) {
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

<Bubble
  {direction}
  {clickable}
  {highlighted}
  padding={file?.thumbnail === undefined ? 'md' : 'xs'}
  on:click
  on:completehighlightanimation
>
  <div class={`body ${direction}`} class:clickable>
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
        <Quote
          {alt}
          content={quote.content}
          clickable={true}
          file={quote.file}
          {onError}
          sender={quote.sender}
          on:click={handleClickQuote}
        />
      </span>
    {/if}

    {#if file !== undefined}
      {#if file.type === 'audio'}
        <span class="audio">
          <AudioPlayer duration={file.duration} fetchAudio={file.fetchFileBytes} {onError}>
            <svelte:fragment slot="footer" let:duration>
              <span class="footer">
                <span class="size">
                  <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-argument -->
                  <Text text={durationToString(duration ?? 0)} wrap={false} />
                </span>
                {#if messageInfoPlacement === 'preview'}
                  <span class="status">
                    <Text text={timestamp.fluent} wrap={false} />
                    <Indicator
                      {direction}
                      options={options.indicatorOptions}
                      {reactions}
                      {status}
                    />
                  </span>
                {/if}
              </span>
            </svelte:fragment>
          </AudioPlayer>
        </span>
      {:else if file.type === 'file'}
        <span class="file">
          <FileInfo
            mediaType={file.mediaType}
            name={file.name}
            sizeInBytes={file.sizeInBytes}
            on:click={handleClickFileInfo}
          >
            <svelte:fragment slot="status">
              {#if messageInfoPlacement === 'preview'}
                <Text text={timestamp.fluent} wrap={false} />
                <Indicator {direction} options={options.indicatorOptions} {reactions} {status} />
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

          <div class="badges">
            {#if file.type === 'video' && file.duration !== undefined}
              <span class="badge">
                <MdIcon theme="Filled">videocam</MdIcon>
                <span class="label">
                  {durationToString(file.duration)}
                </span>
              </span>
            {/if}

            {#if messageInfoPlacement === 'preview'}
              <span class="badge status">
                <Text text={timestamp.short} wrap={false} />
                <Indicator {direction} options={options.indicatorOptions} {reactions} {status} />
              </span>
            {/if}
          </div>

          {#if file.thumbnail !== undefined}
            <LazyImage
              byteStore={file.thumbnail.blobStore}
              constraints={file.thumbnail.constraints ?? {
                min: {
                  // Dynamically increase the min width for longer text.
                  width: Math.min(125 + contentLength, 180),
                  height: 70,
                  size: 16384,
                },
                max: {
                  width: MAX_CONVERSATION_THUMBNAIL_SIZE,
                  height: MAX_CONVERSATION_THUMBNAIL_SIZE,
                  size: 65536,
                },
              }}
              description={alt}
              dimensions={file.thumbnail.expectedDimensions}
              isClickable={true}
              isFocusable={true}
              responsive={true}
              on:click={handleClickThumbnail}
            />
          {/if}
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
          {#if lastEdited !== undefined}
            <Text text={$i18n.t('messaging.prose--message-edited', 'Edited')} wrap={false}></Text>
          {/if}
          <Text text={timestamp.fluent} wrap={false} />
          <Indicator {direction} options={options.indicatorOptions} {reactions} {status} />
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
    align-items: stretch;
    justify-content: start;
    flex-direction: column;

    .sender {
      // If `.sender` is a general-preceding sibling of `.thumbnail`.
      &:has(~ .thumbnail) {
        padding: rem(1px) rem(8px) rem(2px);
      }

      &:has(~ .quote) {
        padding-bottom: rem(4px);
      }
    }

    .text {
      @extend %font-normal-400;
    }

    // If `.text` is a general-subsequent sibling of `.file` or `.quote`.
    .file ~ .text,
    .quote ~ .text {
      padding-top: rem(8px);
    }

    // If `.text` is a general-subsequent sibling of `.thumbnail`.
    .thumbnail ~ .text {
      padding: rem(8px) rem(8px) rem(0px);

      // Prevent text from growing larger than the thumbnail.
      width: min-content;
      min-width: 100%;
    }

    &:not(.clickable) {
      .quote {
        position: relative;

        &::before {
          opacity: 0;
          transition: opacity 0.1s ease-out;

          content: '';
          display: block;
          position: absolute;
          top: rem(-4px);
          left: rem(-4px);
          bottom: rem(-4px);
          right: rem(-4px);
          background-color: var(--mc-message-quote-background-color--hover);
          border-radius: rem(10px);
        }

        &:hover {
          cursor: pointer;

          &::before {
            opacity: 1;
          }
        }
      }

      .quote:first-child {
        &::before {
          left: rem(-6px);
          right: rem(-6px);
        }
      }
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

      .badges {
        position: absolute;
        display: flex;
        gap: rem(8px);
        align-items: center;
        justify-content: space-between;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;

        .badge {
          @extend %font-small-400;
          @include def-var(--c-icon-font-size, var(--mc-message-indicator-icon-size));
          display: flex;
          align-items: center;
          gap: var(--mc-message-indicator-column-gap);
          margin: rem(8px);
          padding: rem(1px) rem(6px);
          border-radius: rem(10px);
          color: var(--mc-message-badge-color);
          background-color: var(--mc-message-badge-background-color);

          &.status {
            margin-left: auto;
          }
        }
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
