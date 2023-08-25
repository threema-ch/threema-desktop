<script lang="ts">
  import {createEventDispatcher} from 'svelte/internal';

  import DateTime from '~/app/ui/generic/form/DateTime.svelte';
  import Text from '~/app/ui/generic/form/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    extractMessageStatus,
    extractTextContent,
  } from '~/app/ui/main/conversation/conversation-messages';
  import FileInfo from '~/app/ui/main/conversation/conversation-messages/content-fragment/FileInfo.svelte';
  import Thumbnail from '~/app/ui/main/conversation/conversation-messages/content-fragment/Thumbnail.svelte';
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageStatus from '~/app/ui/main/conversation/conversation-messages/MessageStatus.svelte';
  import {type AnyReceiverStore} from '~/common/model';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

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
    clickimage: MouseEvent;
  }>();

  function handleClickFileInfo(event: MouseEvent): void {
    dispatch('clickfile', event);
  }

  function handleClickThumbnail(event: MouseEvent): void {
    dispatch('clickimage', event);
  }

  const viewModelStore = viewModelBundle.viewModel;

  $: message = $viewModelStore.body;
  $: quote = $viewModelStore.quote;
  $: quotedViewModelStore =
    quote === undefined || quote === 'not-found' ? undefined : quote.viewModel;
  $: quotedMessage = $quotedViewModelStore?.body;
  $: textContent = extractTextContent(message);
  $: isCaptionlessImage = message.type === 'image' && message.body.caption === undefined;
</script>

<template>
  <div
    class="container"
    class:quoted={isQuoted}
    class:has-text={textContent !== undefined}
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
      {:else if message.type === 'image'}
        <span class="thumbnail">
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
                    width: Math.min(70 + (textContent?.length ?? 0), 180),
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
        </span>
      {:else if message.type === 'audio' || message.type === 'video' || message.type === 'location' || message.type === 'quote'}
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
          <Text text={textContent} mentions={$viewModelStore.mentions} />
        </div>
      {/if}
    </div>

    <!-- Status indicators -->
    {#if !isQuoted}
      <span class="indicators" class:badge={isCaptionlessImage}>
        <span class="time">
          <DateTime date={message.updatedAt} format={isCaptionlessImage ? 'time' : 'auto'} />
        </span>
        <MessageStatus
          direction={message.direction}
          status={extractMessageStatus(message)}
          reaction={message.lastReaction?.type}
          receiverType={receiver.type}
          outgoingReactionDisplay="thumb"
        />
      </span>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: block;

    .quote {
      padding: 0 rem(8px);

      &.not-found {
        padding: rem(8px);
        border-left: solid var(--mc-message-quote-border-width) $warning-orange;
        font-style: italic;
      }
    }

    .quote + .content {
      margin-top: rem(8px);
    }

    .content {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: rem(8px);

      .text {
        max-width: 65ch;
      }
    }

    .indicators {
      display: flex;
      gap: var(--mc-message-indicator-column-gap);
      justify-content: end;
      align-items: center;
      @include def-var(--c-icon-font-size, var(--mc-message-indicator-icon-size));

      .time {
        @extend %font-small-400;
      }

      &.badge {
        position: absolute;
        display: flex;
        right: rem(8px);
        bottom: rem(8px);
        padding: rem(1px) rem(6px);
        border-radius: rem(10px);
        color: var(--mc-message-badge-color);
        background-color: var(--mc-message-badge-background-color);
      }

      &:not(.badge) {
        .time {
          color: var(--mc-message-indicator-time);
        }
      }
    }

    &.quoted {
      .content {
        gap: 0;

        .text {
          color: var(--mc-message-quote-text-color);
        }
      }

      &[data-message-type='image'].has-text {
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
          }

          .text {
            grid-area: text;
          }
        }
      }
    }

    &:not(.quoted) {
      &[data-message-type='image'] {
        .content {
          .text {
            padding: 0 rem(4px);

            // Allow text content to only be as wide as the image.
            width: min-content;
            min-width: 100%;
          }
        }
      }
    }

    @each $color in map-get-req($config, profile-picture-colors) {
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
