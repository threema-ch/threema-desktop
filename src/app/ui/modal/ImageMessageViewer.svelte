<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte/internal';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {globals} from '~/app/globals';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {nodeContainsTarget} from '~/app/ui/utils/node';
  import {type Dimensions} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote, type RemoteProxy} from '~/common/utils/endpoint';
  import {GlobalTimer} from '~/common/utils/timer';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';

  const FALLBACK_PLACEHOLDER_SIZE = 120;

  const log = globals.unwrap().uiLogging.logger(`ui.component.modal.image-detail`);

  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

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
    | {status: 'loaded'; url: string};

  let image: ConversationMessageImageState = {
    status: 'loading',
  };
  // Allow `null` here due to Svelte sometimes setting binds to null.
  /* eslint-disable @typescript-eslint/ban-types */
  let previewElement: HTMLElement | SVGSVGElement | undefined | null = undefined;
  let actionsContainer: HTMLElement | undefined | null = undefined;
  /* eslint-enable @typescript-eslint/ban-types */

  // In order to avoid a quickly-flashing loading icon, define a minimal waiting time
  // until displaying the image.
  let minimalConnectTimerElapsed = false;
  new GlobalTimer()
    .sleep(250)
    .then(() => (minimalConnectTimerElapsed = true))
    .catch((e) => log.error('Sleep timer failed'));

  // Component event dispatcher.
  const dispatch = createEventDispatcher<{
    close: undefined;
    saveFile: undefined;
  }>();

  function handleSave(): void {
    dispatch('saveFile');
  }

  function handleClose(): void {
    dispatch('close');
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
            url: URL.createObjectURL(new Blob([bytes])),
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
      !nodeContainsTarget(actionsContainer, event.target)
    ) {
      handleClose();
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
      <ModalDialog visible={true} on:close={handleClose} on:cancel={handleClose}>
        <div class="container" slot="body">
          {#if image.status === 'loading' || !minimalConnectTimerElapsed}
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
            <img bind:this={previewElement} src={image.url} alt="Image message" on:click />
          {:else if image.status === 'failed'}
            <p class="error">
              {$i18n.t(
                'messaging.error--image-message-image-not-loaded',
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
    overflow: hidden;
    max-width: 100vw;
    max-height: 100vh;
    padding: rem(18px);

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
    }

    .progress {
      grid-area: 1 / 1;
      width: rem(32px);
      height: rem(32px);
    }

    .error {
      padding: rem(24px);
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
