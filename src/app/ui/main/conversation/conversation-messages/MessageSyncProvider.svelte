<script lang="ts">
  import {createEventDispatcher} from 'svelte/internal';

  import IconButtonProgressBarOverlay from '#3sc/components/blocks/Button/IconButtonProgressBarOverlay.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {unreachable} from '~/common/utils/assert';
  import {type PropertiesMarkedRemote, type Remote} from '~/common/utils/endpoint';
  import {
    type ConversationMessageViewModel,
    type ConversationMessageViewModelBundle,
  } from '~/common/viewmodel/conversation-message';
  import {type AnyMessageBody} from '~/common/viewmodel/types';

  /**
   * Bundle containing the viewModel and viewModelController.
   */
  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  const viewModelStore = viewModelBundle.viewModel;

  const dispatch = createEventDispatcher<{
    syncrequest: undefined;
    abortsyncrequest: undefined;
  }>();

  /**
   * Handle a click on the message overlay button.
   */
  function handleMessageOverlayClick(): void {
    switch (message.state.type) {
      case 'unsynced':
        // Start down- or upload.
        // TODO(DESK-961): Handle upload resumption for local unsynced files.
        dispatch('syncrequest');
        break;
      case 'syncing':
        dispatch('abortsyncrequest');
        break;
      case 'synced':
      case 'failed':
        // Nothing to do.
        break;
      default:
        unreachable(message.state);
    }
  }

  function translatedLabelFor(
    syncDirection: PropertiesMarkedRemote<ConversationMessageViewModel>['syncDirection'],
    messageType: Extract<AnyMessageBody['type'], 'file' | 'image' | 'audio' | 'video'>,
    t: typeof $i18n.t,
  ): string {
    switch (syncDirection) {
      case 'download':
        switch (messageType) {
          case 'file':
          case 'audio':
            // TODO(DESK-144): Separate label for audio messages.
            return t('messaging.action--sync-file-download', 'Click to download file');

          case 'image':
            return t('messaging.action--sync-image-download', 'Click to download image');

          case 'video':
            return t('messaging.action--sync-video-download', 'Click to download video');

          default:
            return unreachable(messageType);
        }

      case 'upload':
        switch (messageType) {
          case 'file':
          case 'audio':
            // TODO(DESK-144): Separate label for audio messages.
            return t('messaging.action--sync-file-upload', 'Click to upload file');

          case 'image':
            return t('messaging.action--sync-image-upload', 'Click to upload image');

          case 'video':
            return t('messaging.action--sync-video-upload', 'Click to upload video');

          default:
            return unreachable(messageType);
        }

      case undefined:
        return t('messaging.action--sync-unknown-direction', 'Unknown sync direction');

      default:
        return unreachable(syncDirection);
    }
  }

  function iconFor(syncDirection: typeof $viewModelStore.syncDirection): string {
    switch (syncDirection) {
      case 'download':
        return 'file_download';

      case 'upload':
        return 'file_upload';

      case undefined:
        return 'help';

      default:
        return unreachable(syncDirection);
    }
  }

  $: message = $viewModelStore.body;
</script>

<template>
  <span class="container">
    {#if message.type === 'file' || message.type === 'audio' || message.type === 'video' || message.type === 'image'}
      {#if message.state.type === 'unsynced' || message.state.type === 'syncing'}
        <span class="overlay">
          <button class="button" on:click={handleMessageOverlayClick}>
            {#if message.state.type === 'unsynced'}
              <MdIcon
                theme="Filled"
                title={translatedLabelFor($viewModelStore.syncDirection, message.type, $i18n.t)}
                >{iconFor($viewModelStore.syncDirection)}</MdIcon
              >
            {:else if message.state.type === 'syncing'}
              <!-- TODO(DESK-948): Cancellation <MdIcon theme="Filled">close</MdIcon>-->
              <IconButtonProgressBarOverlay />
            {/if}
          </button>
        </span>
      {/if}
    {/if}

    <slot />
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;

    .overlay {
      position: absolute;
      z-index: $z-index-plus;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      background-color: var(--mc-message-overlay-background-color);

      .button {
        @include clicktarget-button-circle;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--mc-message-overlay-button-color);
        background-color: var(--mc-message-overlay-button-background-color);
        width: rem(44px);
        height: rem(44px);
        font-size: rem(22px);

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
  }
</style>
