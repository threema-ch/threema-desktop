<!--
  @component
  Renders a modal to preview media contained in a message.
-->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import ImagePreview from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/internal/image-preview/ImagePreview.svelte';
  import VideoPreview from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/internal/video-preview/VideoPreview.svelte';
  import type {MessageMediaViewerModalProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/props';
  import type {MediaState} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-media-viewer-modal/types';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import {toast} from '~/app/ui/snackbar';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '~/app/ui/svelte-components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '~/app/ui/svelte-components/generic/Menu/MenuItem.svelte';
  import {handleCopyImage, handleSaveAsFile} from '~/app/ui/utils/file-sync/handlers';
  import {syncAndGetPayload} from '~/app/ui/utils/file-sync/helpers';
  import {nodeIsOrContainsTarget} from '~/app/ui/utils/node';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {isSupportedImageType} from '~/common/utils/image';

  const log = globals.unwrap().uiLogging.logger('ui.component.message-media-viewer-modal');

  type $$Props = MessageMediaViewerModalProps;

  export let file: $$Props['file'];

  let mediaState: MediaState = {status: 'loading'};

  let modalComponent: SvelteNullableBinding<Modal> = null;
  let popoverComponent: SvelteNullableBinding<Popover> = null;

  let actionsElement: SvelteNullableBinding<HTMLElement> = null;
  let modalElement: SvelteNullableBinding<HTMLElement> = null;
  let popoverElement: SvelteNullableBinding<HTMLElement> = null;
  let previewElement: SvelteNullableBinding<HTMLElement> = null;

  let popoverCoordinates: VirtualRect | undefined = undefined;
  let isPopoverOpen = false;

  function handleClickCopyImage(): void {
    handleCopyImage(file, log, $i18n.t, toast.addSimpleSuccess, toast.addSimpleFailure).catch(
      assertUnreachable,
    );
  }

  function handleClickSave(): void {
    handleSaveAsFile(file, log, $i18n.t, toast.addSimpleFailure).catch(assertUnreachable);
  }

  function handleWillClosePopover(): void {
    isPopoverOpen = false;
  }

  function handleContextMenu(event: MouseEvent): void {
    popoverCoordinates = {
      width: 0,
      height: 0,
      left: event.clientX,
      right: 0,
      top: event.clientY,
      bottom: 0,
    };

    isPopoverOpen = true;
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (
      !nodeIsOrContainsTarget(previewElement, event.target) &&
      !nodeIsOrContainsTarget(actionsElement, event.target) &&
      !nodeIsOrContainsTarget(popoverElement, event.target)
    ) {
      if (isPopoverOpen) {
        popoverComponent?.close();
        isPopoverOpen = false;
      } else {
        modalComponent?.close();
      }
    }
  }

  function revokeLoadedMediaUrl(): void {
    if (mediaState.status === 'loaded') {
      URL.revokeObjectURL(mediaState.url);
    }
  }

  function updateMediaState(currentFile: typeof file, t: I18nType['t']): void {
    // `syncAndGetPayload` doesn't need to be caught, as it will never reject and simply return a
    // `SyncFailure` result instead.
    syncAndGetPayload(currentFile.fetchFileBytes, t)
      .then((result) => {
        revokeLoadedMediaUrl();

        switch (result.status) {
          case 'ok':
            if (currentFile.type === 'image' && !isSupportedImageType(result.data.mediaType)) {
              mediaState = {
                status: 'failed',
                localizedReason: $i18n.t(
                  'messaging.error--file-preview-unsupported-error',
                  'This file cannot be previewed.',
                ),
              };
            } else {
              mediaState = {
                status: 'loaded',
                type: currentFile.type,
                url: URL.createObjectURL(
                  new Blob([result.data.bytes], {type: result.data.mediaType}),
                ),
              };
            }
            break;

          case 'error':
            mediaState = {
              status: 'failed',
              localizedReason: result.message,
            };
            break;

          default:
            unreachable(result);
        }
      })
      .catch(assertUnreachable);
  }

  function updatePopoverState(coordinates: VirtualRect | undefined, isOpen: boolean): void {
    if (isOpen && coordinates !== undefined) {
      popoverComponent?.open();
    }
  }

  $: updateMediaState(file, $i18n.t);

  $: updatePopoverState(popoverCoordinates, isPopoverOpen);

  onMount(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    modalElement?.addEventListener('click', handleOutsideClick);
  });

  onDestroy(() => {
    revokeLoadedMediaUrl();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    modalElement?.removeEventListener('click', handleOutsideClick);
  });
</script>

<Modal
  bind:this={modalComponent}
  bind:actionsElement
  bind:element={modalElement}
  wrapper={{
    type: 'none',
    actions: [
      {
        iconName: 'download',
        onClick: handleClickSave,
      },
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
  }}
  on:close
>
  <div class="content">
    {#if mediaState.status === 'loading'}
      <div class="progress">
        <CircularProgress variant="indeterminate" />
      </div>
    {:else if mediaState.status === 'loaded'}
      {#if mediaState.type === 'image'}
        <div class="preview">
          <ImagePreview
            bind:element={previewElement}
            image={mediaState}
            on:contextmenu={handleContextMenu}
          />
        </div>
      {:else if mediaState.type === 'video'}
        <div class="preview">
          <VideoPreview
            bind:element={previewElement}
            video={mediaState}
            on:contextmenu={handleContextMenu}
          />
        </div>
      {:else}
        {unreachable(mediaState)}
      {/if}

      <Popover
        bind:this={popoverComponent}
        bind:element={popoverElement}
        container={modalElement}
        reference={popoverCoordinates}
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
        offset={{left: 4, top: 4}}
        triggerBehavior="open"
        on:willclose={handleWillClosePopover}
      >
        <div class="context-menu" slot="popover">
          <MenuContainer mode="small">
            <MenuItem on:click={handleClickSave}>
              <span class="icon" slot="icon">
                <MdIcon theme="Outlined">download</MdIcon>
              </span>
              <span>{$i18n.t('messaging.action--message-option-save-as-file', 'Save as File')}</span
              >
            </MenuItem>
            {#if file.type === 'image'}
              <MenuItem on:click={handleClickCopyImage}>
                <span class="icon" slot="icon">
                  <MdIcon theme="Outlined">photo_library</MdIcon>
                </span>
                <span>{$i18n.t('messaging.action--message-option-copy-image', 'Copy Image')}</span>
              </MenuItem>
            {/if}
          </MenuContainer>
        </div>
      </Popover>
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
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    place-items: center;

    .preview {
      display: grid;
      position: relative;
      place-items: center;
      width: 100vw;
      height: 100vh;
      padding: rem(41px);
    }

    .progress {
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

  .context-menu {
    --c-menu-container-min-width: #{rem(180px)};
    @extend %elevation-060;
  }
</style>
