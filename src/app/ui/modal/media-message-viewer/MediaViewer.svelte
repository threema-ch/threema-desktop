<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte/internal';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {globals} from '~/app/globals';
  import type {VirtualRect} from '~/app/ui/generic/popover';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import {copyImageBytes} from '~/app/ui/main/conversation/conversation-messages';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {
    fetchMedia,
    type MediaState,
    type MediaViewerContextMenuEvent,
    type MediaViewerMessage,
  } from '~/app/ui/modal/media-message-viewer';
  import ImagePreview from '~/app/ui/modal/media-message-viewer/ImagePreview.svelte';
  import MediaViewerContextMenu from '~/app/ui/modal/media-message-viewer/MediaViewerContextMenu.svelte';
  import VideoPreview from '~/app/ui/modal/media-message-viewer/VideoPreview.svelte';
  import {nodeContainsTarget} from '~/app/ui/utils/node';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import type {Remote, RemoteProxy} from '~/common/utils/endpoint';
  import {GlobalTimer} from '~/common/utils/timer';
  import type {
    ConversationMessageViewModelBundle,
    ConversationMessageViewModelController,
  } from '~/common/viewmodel/conversation-message';

  const log = globals.unwrap().uiLogging.logger(`ui.component.modal.media-message-viewer`);

  /**
   * Bundle containing the viewModel and viewModelController.
   */
  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  /**
   * The message whose media to display in the viewer.
   */
  export let message: MediaViewerMessage;

  let mediaState: MediaState = {status: 'loading'};

  let containerElement: HTMLElement | null;
  let previewElement: HTMLElement | null | undefined = undefined;
  let actionsContainerElement: HTMLElement | null | undefined = undefined;

  let contextMenuPopover: Popover | null | undefined;
  let contextMenuElement: HTMLElement | null | undefined;
  let contextMenuVirtualTrigger: VirtualRect | undefined = undefined;

  // In order to avoid a quickly-flashing loading icon, define a minimal waiting time
  // until displaying the image.
  let minimalLoadTimerElapsed = false;
  new GlobalTimer()
    .sleep(250)
    .then(() => (minimalLoadTimerElapsed = true))
    .catch((error) => log.error(`Sleep timer failed: ${ensureError(error).message}`));

  const dispatch = createEventDispatcher<{
    clickclose: MouseEvent;
    clicksave: MouseEvent;
  }>();

  function handleSave(): void {
    dispatch('clicksave');
  }

  function handleClose(): void {
    dispatch('clickclose');
  }

  function revokeLoadedMediaUrl(): void {
    if (mediaState.status === 'loaded') {
      URL.revokeObjectURL(mediaState.url);
    }
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (
      !nodeContainsTarget(previewElement, event.target) &&
      !nodeContainsTarget(actionsContainerElement, event.target) &&
      !nodeContainsTarget(contextMenuElement, event.target)
    ) {
      handleClose();
    }
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // Prevent ancestor elements from receiving the `contextmenu` event.
    event.stopPropagation();

    // Create `VirtualElement` at click position.
    contextMenuVirtualTrigger = {
      width: 0,
      height: 0,
      left: event.clientX,
      right: 0,
      top: event.clientY,
      bottom: 0,
    };

    contextMenuPopover?.open();
  }

  function handleContextMenuEvent(type: MediaViewerContextMenuEvent): void {
    contextMenuPopover?.close();

    switch (type) {
      case 'clicksave':
        dispatch('clicksave');
        break;
      case 'clickcopy':
        copyImage();
        break;
      default:
        unreachable(type);
    }
  }

  function copyImage(): void {
    if (mediaState.status === 'loaded') {
      if (mediaState.type === 'image') {
        copyImageBytes(mediaState.originalImageBytes, message.body.mediaType, log).catch(
          (error) => {
            // Ignore, already handled and logged by `copyImageBytes`
          },
        );
      } else {
        log.error(`Cannot copy image bytes of media type "${mediaState.type}"`);
      }
    } else {
      log.error('Cannot copy image bytes before they are loaded');
    }
  }

  function updateMediaState(
    currentController: RemoteProxy<ConversationMessageViewModelController>,
    currentMessage: MediaViewerMessage,
    t: I18nType['t'],
  ): void {
    // `catch` is not necessary here, as `fetchMedia` will always be fulfilled.
    void fetchMedia(currentController, currentMessage, log, t).then((state) => {
      revokeLoadedMediaUrl();
      mediaState = state;
    });
  }

  $: updateMediaState(viewModelBundle.viewModelController, message, $i18n.t);

  onMount(() => {
    window.addEventListener('click', handleOutsideClick);
  });

  onDestroy(() => {
    revokeLoadedMediaUrl();
    window.removeEventListener('click', handleOutsideClick);
  });
</script>

<template>
  <div bind:this={containerElement} class="image-detail">
    <ModalWrapper visible={true}>
      <ModalDialog visible={true} elevated={false} on:close={handleClose} on:cancel={handleClose}>
        <div class="container" slot="body">
          {#if mediaState.status === 'loading' || !minimalLoadTimerElapsed}
            <div class="progress">
              <CircularProgress variant="indeterminate" />
            </div>
          {:else if mediaState.status === 'loaded'}
            {#if mediaState.type === 'image'}
              <ImagePreview
                bind:element={previewElement}
                {mediaState}
                on:contextmenu={handleContextMenu}
              />
            {:else if mediaState.type === 'video'}
              <VideoPreview
                bind:element={previewElement}
                {mediaState}
                on:contextmenu={handleContextMenu}
              />
            {:else}
              {unreachable(mediaState)}
            {/if}
          {:else if mediaState.status === 'failed'}
            <p class="error">
              <MdIcon theme="Filled">error</MdIcon>
              {#if mediaState.localizedReason !== undefined}
                {mediaState.localizedReason}
              {:else}
                {$i18n.t(
                  'dialog--media-message-viewer.error--media-not-loaded',
                  'Media could not be loaded.',
                )}
              {/if}
            </p>
          {:else}
            {unreachable(mediaState)}
          {/if}
        </div>
      </ModalDialog>
      <div class="actions" bind:this={actionsContainerElement}>
        <IconButton flavor="naked" on:click={handleSave}>
          <MdIcon theme="Outlined">download</MdIcon>
        </IconButton>

        <IconButton flavor="naked" on:click={handleClose}>
          <MdIcon theme="Outlined">close</MdIcon>
        </IconButton>
      </div>
    </ModalWrapper>

    <Popover
      bind:this={contextMenuPopover}
      bind:element={contextMenuElement}
      container={containerElement ?? undefined}
      reference={contextMenuVirtualTrigger}
      anchorPoints={{
        reference: {
          horizontal: 'left',
          vertical: 'bottom',
        },
        popover: {
          horizontal: 'left',
          vertical: 'top',
        },
      }}
      offset={{left: 0, top: 4}}
      triggerBehavior="open"
    >
      <MediaViewerContextMenu
        slot="popover"
        {message}
        on:clicksave={() => handleContextMenuEvent('clicksave')}
        on:clickcopy={() => handleContextMenuEvent('clickcopy')}
      />
    </Popover>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .image-detail {
    --c-modal-dialog-padding: 0px;
    --c-modal-dialog-background-color: transparent;
    width: 100%;
    height: 100%;
  }

  .container {
    display: block;
    position: relative;
    display: grid;
    place-items: center;
    width: 100vw;
    height: 100vh;
    padding: rem(41px);

    .progress {
      grid-area: 1 / 1;
      width: rem(32px);
      height: rem(32px);
    }

    .error {
      display: flex;
      gap: rem(8px);
      align-items: center;
      padding: rem(24px);
      font-size: medium;
    }
  }

  .actions {
    position: relative;
    display: flex;
    gap: rem(8px);
    z-index: calc($z-index-modal + $z-index-plus);
    position: absolute;
    top: rem(12px);
    right: rem(8px);

    &::before {
      content: '';
      pointer-events: none;
      display: block;
      position: absolute;
      width: calc(100% + rem(256px));
      height: calc(100% + rem(128px));
      top: rem(-12px);
      right: rem(-8px);
      background: radial-gradient(
        farthest-corner at top right,
        rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0.625) 0%,
        rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0.375) 18.75%,
        rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0.0625) 50%,
        rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0) 62.5%
      );
    }
  }
</style>
