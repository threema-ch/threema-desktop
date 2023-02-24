<!--
  @component
  Message "payload" content display (e.g. text or image).
-->
<script lang="ts">
  import {byteSizeToHumanReadable} from '#3sc/utils/number';
  import Text from '~/app/ui/generic/form/Text.svelte';
  import {getFileExtension} from '~/app/ui/modal/media-message';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let message: Message<AnyMessageBody>;

  /**
   * Mentions parsed from the message
   */
  export let mentions: Mention[];

  /**
   * Whether this is a quote display or not.
   */
  export let isQuoted = false;
</script>

<template>
  <div class:is-quoted={isQuoted}>
    {#if message.type === 'text'}
      <div class="text">
        <Text text={message.body.text} {mentions} />
      </div>
    {:else if message.type === 'file'}
      {@const body = message.body}
      {@const extension = body.filename !== undefined ? getFileExtension(body.filename) : 'FILE'}

      <div class="file">
        <div class="info" data-name={body.filename !== undefined}>
          <div class="icon">
            <div class="ext">
              {extension}
            </div>
          </div>
          {#if body.filename !== undefined}
            <div class="name">{body.filename}</div>
          {/if}
          <div class="size">{byteSizeToHumanReadable(body.size)}</div>
        </div>
        {#if body.caption !== undefined}
          <div class="caption">
            <Text text={body.caption} />
          </div>
        {/if}
      </div>
    {:else}
      <div class="unsupported-message">Unsupported message type `{message.type}`</div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .is-quoted {
    .text,
    .unsupported-message {
      opacity: 0.6;
    }
  }

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

      .ext {
        font-size: var(--mc-message-file-icon-font-size);
      }
    }

    .name {
      grid-area: name;
    }

    .size {
      grid-area: size;
      @extend %font-small-400;
      color: var(--mc-message-file-size-color);
    }
  }
</style>
