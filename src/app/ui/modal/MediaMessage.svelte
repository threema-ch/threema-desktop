<!--
  @component
  The modal window used for sending files, images and other media.
-->
<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import DropZoneProvider from '~/app/ui/components/hocs/drop-zone-provider/DropZoneProvider.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import EmojiPicker from '~/app/ui/components/molecules/emoji-picker/EmojiPicker.svelte';
  import {showFileResultErrorToast} from '~/app/ui/components/partials/conversation/helpers';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import Tooltip from '~/app/ui/generic/popover/Tooltip.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    generateThumbnail,
    type MediaFile,
    resizeImage,
    validateMediaFiles,
    type ValidationResult,
  } from '~/app/ui/modal/media-message';
  import ActiveMediaFile from '~/app/ui/modal/media-message/ActiveMediaFile.svelte';
  import Caption from '~/app/ui/modal/media-message/Caption.svelte';
  import ConfirmClose from '~/app/ui/modal/media-message/ConfirmClose.svelte';
  import Miniatures from '~/app/ui/modal/media-message/Miniatures.svelte';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '~/app/ui/svelte-components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {FileLoadResult} from '~/app/ui/utils/file';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {type Dimensions, ensureU53, type u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {isSupportedImageType} from '~/common/utils/image';
  import {WritableStore} from '~/common/utils/store';
  import type {
    SendFileBasedMessageEventDetail,
    SendMessageEventDetail,
  } from '~/common/viewmodel/conversation/main/controller/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.media-message-modal');
  const hotkeyManager = globals.unwrap().hotkeyManager;

  export let title: string;
  export let mediaFiles: MediaFile[];
  export let visible: boolean;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  /**
   * Whether or not more files can be attached to the message.
   */
  export let moreFilesAttachable = true;

  // Values bound by Svelte could become null.
  let sendButtonWrapper: HTMLElement | null | undefined;
  let sendButtonPopover: Popover | null | undefined;
  let emojiPickerPopover: Popover | null | undefined;
  let captionComposeArea: Caption | null | undefined;

  let activeMediaFileIndex: u53 = 0;
  let confirmCloseDialogVisible = false;
  let isSendingEnabled = false;

  /**
   * Component event dispatcher.
   */
  const dispatch = createEventDispatcher<{close: undefined; clicksend: SendMessageEventDetail}>();

  /**
   * Handle change events of the caption textarea.
   *
   * @param event Event data including the current length of text in bytes.
   */
  function handleTextChange(event: CustomEvent<u53>): void {
    saveCurrentCaption();
  }

  /**
   * Save caption text to the `mediaFile.caption` store.
   */
  function saveCurrentCaption(): void {
    mediaFiles[activeMediaFileIndex]?.caption.set(captionComposeArea?.getText());
  }

  /**
   * Save caption text to the `mediaFile.caption` store and clear the caption textarea.
   */
  function saveAndClearCurrentCaption(): void {
    saveCurrentCaption();
    captionComposeArea?.clearText();
  }

  /**
   * Remove the active media file and switch to the next one.
   */
  function removeActiveMediaFile(): void {
    saveAndClearCurrentCaption();

    // Remove and trigger Svelte reactivity.
    mediaFiles = [
      ...mediaFiles.slice(0, activeMediaFileIndex),
      ...mediaFiles.slice(activeMediaFileIndex + 1),
    ];

    if (mediaFiles.length > 0) {
      // Set new active media file.
      setNewActiveMediaFile(Math.max(activeMediaFileIndex - 1, 0));
    } else {
      // Close the modal if all files have been removed.
      visible = false;
      dispatch('close');
    }
  }

  /**
   * Set the next active media file (eg, by click on preview of user), if it is undefined, hide
   * dialog.
   */
  function setNewActiveMediaFile(index: u53): void {
    const mediaFile = mediaFiles[index];
    if (mediaFile !== undefined) {
      activeMediaFileIndex = index;

      captionComposeArea?.insertText(mediaFile.caption.get() ?? '');
      captionComposeArea?.focus();
    }
  }

  async function sendMessages(): Promise<void> {
    saveCurrentCaption();

    const isValid = validateMediaFiles(mediaFiles).every(([_, result]) => result.status === 'ok');
    if (!isValid) {
      log.error('No media messages were sent because some files or messages contain errors');
      return;
    }

    visible = false;
    dispatch('close');

    // Prepare files to be sent
    const files: SendFileBasedMessageEventDetail['files'] = await Promise.all(
      mediaFiles.map(async (mediaFile) => {
        const isImage = isSupportedImageType(mediaFile.file.type);

        // If file is an image, downsize it to save bandwidth and strip metadata
        let fileBlob: Blob;
        let dimensions: Dimensions | undefined;
        let sendAsFile = mediaFile.sendAsFile.get();
        if (isImage && !sendAsFile) {
          const resizeResult = await resizeImage(mediaFile.file);
          if (resizeResult === undefined) {
            log.warn(`Could not resize image with type ${mediaFile.file.type}, sending as file`);
            fileBlob = mediaFile.file;
            sendAsFile = true;
          } else {
            fileBlob = resizeResult.blob;
            dimensions = resizeResult.dimensions;
          }
        } else {
          fileBlob = mediaFile.file;
        }

        const thumbnailBlob = await mediaFile.thumbnail;
        return {
          bytes: new Uint8Array(await fileBlob.arrayBuffer()),
          thumbnailBytes:
            thumbnailBlob !== undefined
              ? new Uint8Array(await thumbnailBlob.arrayBuffer())
              : undefined,
          caption: mediaFile.caption.get(),
          fileName: mediaFile.file.name,
          fileSize: ensureU53(fileBlob.size),
          mediaType: fileBlob.type,
          thumbnailMediaType: thumbnailBlob?.type,
          dimensions,
          sendAsFile,
        };
      }),
    );

    dispatch('clicksend', {
      type: 'files',
      files,
    });
  }

  function attachMoreFiles(fileResult: FileLoadResult): void {
    switch (fileResult.status) {
      case 'empty':
      case 'inaccessible':
        showFileResultErrorToast(fileResult.status, i18n, log);
        return;

      case 'partial':
        showFileResultErrorToast(fileResult.status, i18n, log);
        break;

      case 'ok':
        break;

      default:
        unreachable(fileResult);
    }

    const currentCount = mediaFiles.length;
    const newMediaFiles = fileResult.files.map(
      (file): MediaFile => ({
        type: 'local',
        file,
        thumbnail: generateThumbnail(file, log),
        caption: new WritableStore<string | undefined>(undefined),
        sanitizedFilenameDetails: getSanitizedFileNameDetails(file),
        sendAsFile: new WritableStore(false),
      }),
    );

    mediaFiles = [...mediaFiles, ...newMediaFiles];

    saveAndClearCurrentCaption();
    setNewActiveMediaFile(currentCount);
  }

  function closeWithOptionalConfirmation(event: CustomEvent): void {
    event.preventDefault();

    const needsConfirmation = mediaFiles.length > 1 || captionComposeArea?.getText() !== '';

    if (needsConfirmation) {
      confirmCloseDialogVisible = true;
    } else {
      close(event);
    }
  }

  function handleDropFiles(event: CustomEvent<FileLoadResult>): void {
    attachMoreFiles(event.detail);
    event.stopPropagation();
  }

  /**
   * Close this media message modal.
   */
  function close(_: CustomEvent): void {
    visible = false;
    dispatch('close');
  }

  $: validatedMediaFiles = validateMediaFiles(mediaFiles);

  let activeMediaFile: MediaFile | undefined;
  let activeValidationResult: ValidationResult | undefined;
  $: {
    const file = validatedMediaFiles[activeMediaFileIndex];
    if (file !== undefined) {
      [activeMediaFile, activeValidationResult] = file;
    }
  }

  $: activeCaption = activeMediaFile?.caption;
  $: {
    // Trigger reactivity of `mediaFiles` when `activeCaption` changes (e.g. to trigger another
    // validation).
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $activeCaption;
    mediaFiles = [...mediaFiles];
  }

  $: isSendingEnabled = validatedMediaFiles.every(([_, result]) => result.status === 'ok');

  function handleHotkeyControlE(): void {
    emojiPickerPopover?.toggle();
  }

  function handleTriggerMouseEnter(event: MouseEvent): void {
    sendButtonPopover?.open();
  }

  function handleTriggerMouseLeave(event: MouseEvent): void {
    sendButtonPopover?.close();
  }

  onMount(() => {
    captionComposeArea?.focus();
    hotkeyManager.registerHotkey({control: true, code: 'KeyE'}, handleHotkeyControlE);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handleHotkeyControlE);
  });
</script>

<Modal
  bind:this={modalComponent}
  wrapper={{
    type: 'none',
  }}
  options={{
    allowClosingWithEsc: false,
    suspendHotkeysWhenVisible: false,
  }}
>
  <DropZoneProvider
    overlay={{
      message: $i18n.t(
        'dialog--compose-media-message.hint--drop-files-to-add',
        'Drop files here to add',
      ),
    }}
    on:dropfiles={handleDropFiles}
  >
    <div class="content">
      <ModalDialog
        bind:visible
        on:close={closeWithOptionalConfirmation}
        on:cancel={closeWithOptionalConfirmation}
      >
        <TitleAndClose let:modal {modal} slot="header" {title} />
        <div class="body" slot="body">
          {#if activeMediaFile !== undefined && activeValidationResult !== undefined}
            <ActiveMediaFile
              mediaFile={activeMediaFile}
              validationResult={activeValidationResult}
              on:remove={removeActiveMediaFile}
            />
          {/if}
        </div>
        <div class="footer" slot="footer">
          <div class="caption">
            <Caption
              bind:this={captionComposeArea}
              initialText={activeMediaFile?.caption.get()}
              on:submit={sendMessages}
              on:textbytelengthdidchange={handleTextChange}
            />
          </div>
          <Popover
            bind:this={emojiPickerPopover}
            anchorPoints={{
              reference: {
                horizontal: 'right',
                vertical: 'top',
              },
              popover: {
                horizontal: 'right',
                vertical: 'bottom',
              },
            }}
            offset={{
              left: -10,
              top: -24,
            }}
          >
            <IconButton slot="trigger" flavor="naked">
              <MdIcon theme="Outlined">insert_emoticon</MdIcon>
            </IconButton>
            <EmojiPicker
              slot="popover"
              on:clickemoji={(event) => captionComposeArea?.insertText(event.detail)}
            />
          </Popover>
          <div class="miniatures">
            <Miniatures
              {validatedMediaFiles}
              {activeMediaFileIndex}
              {moreFilesAttachable}
              on:select={(event) => {
                saveAndClearCurrentCaption();
                const index = mediaFiles.indexOf(event.detail);
                if (index !== -1) {
                  setNewActiveMediaFile(index);
                }
              }}
              on:fileDrop={(event) => attachMoreFiles(event.detail)}
            />
          </div>
          <div class="action" class:disabled={!isSendingEnabled}>
            <button
              class="send"
              bind:this={sendButtonWrapper}
              on:mouseenter={handleTriggerMouseEnter}
              on:mouseleave={handleTriggerMouseLeave}
            >
              <IconButton flavor="filled" disabled={!isSendingEnabled} on:click={sendMessages}>
                <MdIcon theme="Filled">arrow_upward</MdIcon>
              </IconButton>
            </button>

            {#if !isSendingEnabled && sendButtonPopover !== null}
              <Tooltip bind:popover={sendButtonPopover} reference={sendButtonWrapper}>
                <p class="tooltip-content">
                  {$i18n.t(
                    'messaging.error--send-file-miscellaneous-errors',
                    'Some files contain errors',
                  )}
                </p>
              </Tooltip>
            {/if}
          </div>
        </div>
      </ModalDialog>
    </div>
  </DropZoneProvider>

  <ConfirmClose bind:visible={confirmCloseDialogVisible} on:confirm={close} />
</Modal>

<style lang="scss">
  @use 'component' as *;

  $width: 640px;

  .content {
    position: relative;
    z-index: 0;
    width: 100vw;
    height: 100vh;
  }

  .body {
    @extend %font-normal-400;
    background-color: var(--cc-media-message-background-color);
    width: rem($width);
    height: rem(368px);
  }

  .footer {
    display: grid;
    width: rem($width);
    align-items: center;
    grid-template:
      'caption emoji' minmax(#{rem(64px)}, auto)
      'miniatures action' auto
      / calc(100% - #{rem(50px)}) #{rem(50px)};

    .caption {
      padding: rem(8px) rem(8px) rem(8px) rem(16px);
    }

    .miniatures {
      align-self: start;
      padding: 0 rem(16px) 0 rem(16px);
    }

    .action {
      align-self: start;
      justify-self: left;
      margin-top: rem(12px);
      margin-left: rem(1px);

      .tooltip-content {
        white-space: nowrap;
        padding: 0;
        margin: rem(10px);
      }

      .send {
        @include clicktarget-button-circle;
      }

      &.disabled {
        :global(button) {
          cursor: not-allowed;
        }
      }
    }
  }
</style>
