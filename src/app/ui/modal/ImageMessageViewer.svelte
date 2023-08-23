<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte/internal';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {globals} from '~/app/globals';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import {type VirtualRect} from '~/app/ui/generic/popover';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {copyImageBytes} from '~/app/ui/main/conversation/conversation-messages';
  import {type ImageMessageViewerContextMenuEvent} from '~/app/ui/modal/image-message-viewer';
  import ImageMessageViewerContextMenu from '~/app/ui/modal/image-message-viewer/ImageMessageViewerContextMenu.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {nodeContainsTarget} from '~/app/ui/utils/node';
  import {type Dimensions, type ReadonlyUint8Array} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote, type RemoteProxy} from '~/common/utils/endpoint';
  import {GlobalTimer} from '~/common/utils/timer';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';

  const FALLBACK_PLACEHOLDER_SIZE = 120;

  const log = globals.unwrap().uiLogging.logger(`ui.component.modal.image-detail`);

  /**
   * View model controller of the associated conversation message.
   */
  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

  /**
   * The image media type.
   */
  export let mediaType: string;

  /**
   * The real dimensions of the image.
   */
  export let dimensions: Dimensions | undefined;

  /**
   * States used to describe the progress when loading the image.
   */
  type ConversationMessageImageState =
    | {status: 'loading'}
    | {status: 'failed'}
    | {status: 'loaded'; bytes: ReadonlyUint8Array; url: string};

  let image: ConversationMessageImageState = {
    status: 'loading',
  };
  // Allow `null` here due to Svelte sometimes setting binds to null.
  /* eslint-disable @typescript-eslint/ban-types */
  let previewElement: HTMLElement | SVGSVGElement | undefined | null = undefined;
  let actionsContainer: HTMLElement | undefined | null = undefined;

  // Context menu
  let contextMenuPopover: Popover | null;
  let contextMenuElement: HTMLElement | null | undefined;
  let contextMenuVirtualTrigger: VirtualRect | undefined = undefined;
  let container: HTMLElement | null;
  /* eslint-enable @typescript-eslint/ban-types */

  // In order to avoid a quickly-flashing loading icon, define a minimal waiting time
  // until displaying the image.
  let minimalLoadTimerElapsed = false;
  new GlobalTimer()
    .sleep(250)
    .then(() => (minimalLoadTimerElapsed = true))
    .catch((e) => log.error('Sleep timer failed'));

  // Component event dispatcher.
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

  function revokeImageUrl(): void {
    if ('url' in image) {
      URL.revokeObjectURL(image.url);
    }
  }

  function getImage(controller: RemoteProxy<ConversationMessageViewModelController>): void {
    controller
      ?.getBlob()
      .then((bytes) => {
        if (bytes !== undefined) {
          // Revoke previous image URL.
          revokeImageUrl();
          // Generate new image URL.
          image = {
            status: 'loaded',
            bytes,
            url: URL.createObjectURL(new Blob([bytes], {type: mediaType})),
          };
        } else {
          image = {
            status: 'failed',
          };
        }
      })
      .catch((error) => {
        image = {
          status: 'failed',
        };
      });
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (
      !nodeContainsTarget(previewElement, event.target) &&
      !nodeContainsTarget(actionsContainer, event.target) &&
      !nodeContainsTarget(contextMenuElement, event.target)
    ) {
      handleClose();
    }
  }

  function handleContextMenuAction(event: MouseEvent): void {
    if (event.type === 'contextmenu') {
      contextMenuVirtualTrigger = {
        width: 0,
        height: 0,
        left: event.clientX,
        right: 0,
        top: event.clientY,
        bottom: 0,
      };
    } else {
      contextMenuVirtualTrigger = undefined;
    }

    contextMenuPopover?.open();
  }

  function handleContextMenuEvent(type: ImageMessageViewerContextMenuEvent): void {
    contextMenuPopover?.close();

    switch (type) {
      case 'clicksaveimage':
        dispatch('clicksave');
        break;
      case 'clickcopyimage':
        copyImage();
        break;
      default:
        unreachable(type);
    }
  }

  function copyImage(): void {
    if (image.status === 'loaded') {
      copyImageBytes(image.bytes, mediaType, log).catch((error) => {
        // Ignore, already handled and logged by `copyImageBytes`
      });
    } else {
      log.warn("Cannot copy image bytes before they're loaded");
    }
  }

  $: if (messageViewModelController !== undefined) {
    getImage(messageViewModelController);
  }

  onMount(() => {
    window.addEventListener('click', handleOutsideClick);
  });

  onDestroy(() => {
    revokeImageUrl();
    window.removeEventListener('click', handleOutsideClick);
  });
</script>

<template>
  <div class="image-detail">
    <ModalWrapper visible={true}>
      <ModalDialog visible={true} elevated={false} on:close={handleClose} on:cancel={handleClose}>
        <div bind:this={container} class="container" slot="body">
          {#if image.status === 'loading' || !minimalLoadTimerElapsed}
            <div class="progress">
              <CircularProgress variant="indeterminate" />
            </div>

            <!-- SVG is used here to mimic the aspect-ratio-related behavior of an `img`. -->
            <svg
              bind:this={previewElement}
              class="placeholder"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 {dimensions?.width ?? FALLBACK_PLACEHOLDER_SIZE} {dimensions?.height ??
                FALLBACK_PLACEHOLDER_SIZE}"
              preserveAspectRatio="xMidYMid meet"
              width={dimensions?.width ?? FALLBACK_PLACEHOLDER_SIZE}
              height={dimensions?.height ?? FALLBACK_PLACEHOLDER_SIZE}
            />
          {:else if image.status === 'loaded'}
            <img
              bind:this={previewElement}
              use:contextMenuAction={handleContextMenuAction}
              src={image.url}
              alt={$i18n.t(
                'dialog--image-message-viewer.hint--image-preview',
                'Full-size image preview',
              )}
            />

            <Popover
              bind:this={contextMenuPopover}
              bind:element={contextMenuElement}
              reference={contextMenuVirtualTrigger}
              container={container ?? undefined}
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
              <ImageMessageViewerContextMenu
                slot="popover"
                on:clicksaveimage={() => handleContextMenuEvent('clicksaveimage')}
                on:clickcopyimage={() => handleContextMenuEvent('clickcopyimage')}
              />
            </Popover>
          {:else if image.status === 'failed'}
            <p class="error">
              <MdIcon theme="Filled">error</MdIcon>
              {$i18n.t(
                'dialog--image-message-viewer.error--image-message-image-not-loaded',
                'The image could not be loaded.',
              )}
            </p>
          {:else}
            {unreachable(image)}
          {/if}
        </div>
      </ModalDialog>
      <div class="actions" bind:this={actionsContainer}>
        <IconButton flavor="naked" on:click={handleSave}>
          <MdIcon theme="Outlined">download</MdIcon>
        </IconButton>

        <IconButton flavor="naked" on:click={handleClose}>
          <MdIcon theme="Outlined">close</MdIcon>
        </IconButton>
      </div>
    </ModalWrapper>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .image-detail {
    --c-modal-dialog-padding: 0px;
    --c-modal-dialog-background-color: transparent;
  }

  .container {
    display: block;
    position: relative;
    display: grid;
    place-items: center;
    max-width: 100vw;
    max-height: 100vh;
    padding: rem(41px);

    .placeholder,
    img {
      grid-area: 1 / 1;
      border-radius: rem(8px);
      display: block;
      object-fit: contain;
      min-width: rem(16px);
      min-height: rem(16px);
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      background-color: var(--t-main-background-color);
      @extend %elevation-160;
    }

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
