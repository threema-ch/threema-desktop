<script lang="ts">
  import {createEventDispatcher} from 'svelte/internal';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Prose from '~/app/ui/components/atoms/prose/Prose.svelte';
  import DateTime from '~/app/ui/generic/form/DateTime.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    extractMessageStatus,
    extractTextContent,
  } from '~/app/ui/main/conversation/conversation-messages';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageStatus from '~/app/ui/main/conversation/conversation-messages/MessageStatus.svelte';
  import AudioPlayer from '~/app/ui/main/conversation/conversation-messages/content-fragment/AudioPlayer.svelte';
  import FileInfo from '~/app/ui/main/conversation/conversation-messages/content-fragment/FileInfo.svelte';
  import Thumbnail from '~/app/ui/main/conversation/conversation-messages/content-fragment/Thumbnail.svelte';
  import {sanitizeAndParseTextToHtml} from '~/app/ui/utils/text';
  import type {AnyReceiverStore} from '~/common/model';
  import {unreachable} from '~/common/utils/assert';
  import {durationToString} from '~/common/utils/date';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

  /**
   * Bundle containing the viewModel and viewModelController.
   */
  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  /**
   * The Conversation's receiver.
   */
  export let receiver: Remote<AnyReceiverStore>;

  /**
   * Whether this message body should be styled as quoted.
   */
  export let isQuoted = false;

  const dispatch = createEventDispatcher<{
    clickfile: MouseEvent;
    clickthumbnail: MouseEvent;
  }>();

  function handleClickFileInfo(event: MouseEvent): void {
    dispatch('clickfile', event);
  }

  function handleClickThumbnail(event: MouseEvent): void {
    dispatch('clickthumbnail', event);
  }

  const viewModelStore = viewModelBundle.viewModel;

  $: message = $viewModelStore.body;
  $: quote = $viewModelStore.quote;
  $: quotedViewModelStore =
    quote === undefined || quote === 'not-found' ? undefined : quote.viewModel;
  $: quotedMessage = $quotedViewModelStore?.body;
  $: textContent = extractTextContent(message);
  $: isCaptionlessMedia =
    (message.type === 'image' || message.type === 'video') && message.body.caption === undefined;
</script>

<template>
  <div
    class="container"
    class:quoted={isQuoted}
    class:has-text={textContent !== undefined}
    class:synced={message.state.type === 'synced'}
    data-message-type={message.type}
  >
    <!-- Quoted message -->
    {#if quote === 'not-found'}
      <div class="quote not-found">
        {$i18n.t(
          'messaging.error--quoted-message-not-found',
          'The quoted message could not be found.',
        )}
      </div>
    {:else if !isQuoted && quote !== undefined}
      <div class="quote" data-color={quotedMessage?.sender.profilePicture.color}>
        <svelte:self viewModelBundle={quote} {receiver} isQuoted={true} />
      </div>
    {/if}

    <div class="content">
      <!-- Sender -->
      {#if isQuoted}
        <div class="sender">
          <MessageContact name={message.sender.name} color={message.sender.profilePicture.color} />
        </div>
      {/if}

      <!-- Non-text content -->
      {#if message.type === 'text'}
        <!-- Don't render here yet, as text is regular content. -->
      {:else if message.type === 'file'}
        <FileInfo on:click={handleClickFileInfo} {message} />
      {:else if message.type === 'audio'}
        <div class="audio">
          <AudioPlayer {message} messageViewModelController={viewModelBundle.viewModelController} />
        </div>
      {:else if message.type === 'image' || message.type === 'video'}
        <span class="thumbnail">
          {#if message.type === 'video'}
            <button class="play" on:click={handleClickThumbnail}>
              <MdIcon theme="Filled">play_arrow</MdIcon>
            </button>
          {/if}

          <Thumbnail
            on:click={handleClickThumbnail}
            {message}
            isClickable={!isQuoted}
            messageViewModelController={viewModelBundle.viewModelController}
            constraints={isQuoted
              ? {
                  min: {
                    width: 40,
                    height: 40,
                  },
                  max: {
                    width: 40,
                    height: 40,
                  },
                }
              : {
                  min: {
                    // Dynamically increase the min width for longer text.
                    width: Math.min(125 + (textContent?.length ?? 0), 180),
                    height: 70,
                    size: 16384,
                  },
                  max: {
                    width: 384,
                    height: 384,
                    size: 65536,
                  },
                }}
          />

          <!-- Thumbnail overlays -->
          {#if !isQuoted}
            <span class="badges">
              {#if message.type === 'video' && message.body.duration !== undefined}
                <span class="badge">
                  <MdIcon theme="Filled">videocam</MdIcon>
                  <span class="label">
                    {durationToString(message.body.duration)}
                  </span>
                </span>
              {/if}
            </span>
          {/if}
        </span>
      {:else if message.type === 'location' || message.type === 'quote'}
        <div class="unsupported-message">
          {$i18n.t(
            'messaging.error--unsupported-message-type',
            'Unsupported message type "{type}"',
            {
              type: message.type,
            },
          )}
        </div>
      {:else}
        {unreachable(message)}
      {/if}

      <!-- Text content -->
      {#if textContent !== undefined}
        <div class="text">
          <Prose
            content={{
              sanitizedHtml: sanitizeAndParseTextToHtml(textContent, $i18n.t, {
                highlights: [],
                mentions: $viewModelStore.mentions,
                shouldLinkMentions: true,
                shouldParseLinks: true,
                shouldParseMarkup: true,
              }),
            }}
            selectable={true}
            wrap={true}
          />
        </div>
      {/if}
    </div>

    <!-- Status indicator -->
    {#if !isQuoted}
      <span class="indicators" class:as-badges={isCaptionlessMedia}>
        {#if message.type === 'audio'}
          <span class="indicator">
            <span class="label">
              {durationToString(message.body.duration ?? 0)}
            </span>
          </span>
        {/if}

        <span class="indicator">
          <span class="label">
            <DateTime date={message.updatedAt} format={isCaptionlessMedia ? 'time' : 'auto'} />
          </span>
          <MessageStatus
            direction={message.direction}
            status={extractMessageStatus(message)}
            reaction={message.lastReaction?.type}
            receiverType={receiver.type}
            outgoingReactionDisplay="thumb"
          />
        </span>
      </span>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  /* Basic styles & image placement */

  .container {
    display: block;
    position: relative;

    .quote {
      padding: 0 rem(8px);

      &.not-found {
        padding: rem(8px);
        border-left: solid var(--mc-message-quote-border-width) $warning-orange;
        font-style: italic;
      }

      & + .content {
        margin-top: rem(8px);
      }
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: rem(8px);

      .text {
        max-width: 65ch;
      }

      .thumbnail {
        position: relative;

        .play {
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

      .audio {
        width: 100%;
      }
    }

    &.quoted {
      .content {
        gap: 0;

        .text {
          color: var(--mc-message-quote-text-color);
        }

        .thumbnail {
          .play {
            width: rem(24px);
            height: rem(24px);
            left: calc(50% - rem(12px));
            top: calc(50% - rem(12px));
            font-size: rem(14px);
          }
        }

        .audio {
          margin-top: rem(4px);
          margin-bottom: rem(4px);
        }
      }

      &[data-message-type='image'].has-text,
      &[data-message-type='video'].has-text,
      &[data-message-type='audio'].has-text {
        .content {
          display: grid;
          grid-template:
            'sender thumbnail' min-content
            'text thumbnail' 1fr
            / auto min-content;
          column-gap: rem(24px);
          row-gap: 0;

          .sender {
            grid-area: sender;
          }

          .thumbnail {
            grid-area: thumbnail;
            pointer-events: none;
          }

          .audio {
            grid-area: thumbnail;
          }

          .text {
            grid-area: text;
          }
        }
      }
    }

    &:not(.quoted) {
      &[data-message-type='image'],
      &[data-message-type='video'] {
        .content .text {
          padding: 0 rem(4px);

          // Allow text content to only be as wide as the image.
          width: min-content;
          min-width: 100%;
        }
      }
    }

    &:not(.synced) {
      .content .thumbnail .play {
        display: none;
      }
    }
  }

  /* Indicator & badge styles */

  .container {
    .badges,
    .indicators {
      display: flex;
      gap: rem(8px);
      justify-content: start;
      align-items: center;
      pointer-events: none;
    }

    &[data-message-type='image'],
    &[data-message-type='video'] {
      .badges,
      .indicators {
        container-type: inline-size;
        container-name: badge-container;
      }

      .indicators:not(.as-badges) {
        padding-left: rem(4px);
        padding-right: rem(4px);
      }
    }

    &[data-message-type='audio'] {
      .indicators {
        justify-content: space-between;
        padding-left: rem(40px);
      }
    }

    .badge,
    .indicator {
      @include def-var(--c-icon-font-size, var(--mc-message-indicator-icon-size));
      display: flex;
      align-items: center;
      gap: var(--mc-message-indicator-column-gap);
      color: var(--mc-message-indicator-label);

      .label {
        @extend %font-small-400;
      }
    }

    .badge,
    .indicators.as-badges .indicator {
      margin: rem(8px);
      padding: rem(1px) rem(6px);
      border-radius: rem(10px);
      color: var(--mc-message-badge-color);
      background-color: var(--mc-message-badge-background-color);
    }

    .content .thumbnail .badges,
    .indicators.as-badges {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .indicators {
      justify-content: end;
    }

    @container badge-container (max-width: 11rem) {
      .badge {
        display: none;
      }
    }
  }

  @each $color in map-get-req($config, profile-picture-colors) {
    .container {
      .quote[data-color='#{$color}'] {
        .sender {
          color: var(--c-profile-picture-initials-#{$color}, default);
        }

        border-left: solid
          var(--mc-message-quote-border-width)
          var(--c-profile-picture-initials-#{$color}, default);
      }
    }
  }
</style>
