<script lang="ts">
  import {createEventDispatcher, onDestroy} from 'svelte/internal';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {globals} from '~/app/globals';
  import {i18n} from '~/app/ui/i18n';
  import {type ConversationMessageImageState} from '~/app/ui/main/conversation/conversation-messages';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type Dimensions} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote, type RemoteProxy} from '~/common/utils/endpoint';
  import {GlobalTimer} from '~/common/utils/timer';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';

  const log = globals.unwrap().uiLogging.logger(`ui.component.modal.image-detail`);

  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

  /**
   * The real dimensions of the image.
   */
  export let dimensions: Dimensions | undefined;

  let image: ConversationMessageImageState = {
    status: 'loading',
  };

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

  $: if (messageViewModelController !== undefined) {
    getImage(messageViewModelController);
  }

  onDestroy(() => {
    revokeImageUrl();
  });
</script>

<template>
  <div class="image-detail">
    <ModalWrapper visible={true}>
      <ModalDialog
        visible={true}
        on:clickoutside={handleClose}
        on:close={handleClose}
        on:cancel={handleClose}
      >
        <div
          class="body"
          slot="body"
          style={dimensions === undefined
            ? ''
            : `${
                dimensions.width > dimensions.height
                  ? `width: min(calc(100vw - 2.4rem), ${dimensions.width}px);`
                  : `height: min(calc(100vh - 2.4rem), ${dimensions.height}px);`
              } aspect-ratio: ${dimensions.width} / ${dimensions.height};`}
        >
          {#if image.status === 'loading' || !minimalConnectTimerElapsed}
            <div class="progress">
              <CircularProgress variant="indeterminate" />
            </div>
          {:else if image.status === 'loaded'}
            <img src={image.url} alt="Image message" on:click />
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
      <div class="actions">
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
  }

  .body {
    display: grid;
    place-content: center;
    border-radius: rem(8px);
    overflow: hidden;
    min-width: rem(140px);
    min-height: rem(140px);
    max-width: calc(100vw - 2.4rem);
    max-height: calc(100vh - 2.4rem);

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .progress {
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
