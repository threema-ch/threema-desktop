<!--
  @component
  The modal window used for sending files, images and other media.
-->
<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import DropZone from '#3sc/components/blocks/DropZone/DropZone.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import type {FileResult} from '#3sc/utils/filelist';
  import {globals} from '~/app/globals';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import Tooltip from '~/app/ui/generic/popover/Tooltip.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {showFileResultError} from '~/app/ui/main/conversation/compose';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
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
  import {type Dimensions, ensureU53, type u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {isSupportedImageType} from '~/common/utils/image';
  import {WritableStore} from '~/common/utils/store';
  import type {
    SendFileBasedMessagesEventDetail,
    SendMessageEventDetail,
  } from '~/common/viewmodel/conversation';

  const log = globals.unwrap().uiLogging.logger('ui.component.media-message-modal');
  const hotkeyManager = globals.unwrap().hotkeyManager;

  export let title: string;
  export let mediaFiles: MediaFile[];
  export let visible: boolean;

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
  const dispatch = createEventDispatcher<{sendMessage: SendMessageEventDetail}>();

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

    // Prepare files to be sent
    const files: SendFileBasedMessagesEventDetail['files'] = await Promise.all(
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

    dispatch('sendMessage', {
      type: 'files',
      files,
    });
  }

  function attachMoreFiles(fileResult: FileResult): void {
    switch (fileResult.status) {
      case 'empty':
      case 'inaccessible':
        showFileResultError(fileResult.status, i18n, log);
        return;

      case 'partial':
        showFileResultError(fileResult.status, i18n, log);
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

  /**
   * Close this media message modal.
   */
  function close(_: CustomEvent): void {
    visible = false;
  }

  let zoneHover = false;
  let bodyHover = false;

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

<svelte:body
  on:threemadragstart={() => {
    bodyHover = true;
  }}
  on:threemadragend={() => {
    bodyHover = false;
  }}
/>

<template>
  <ModalWrapper {visible} suspendHotkeysWhenVisible={false}>
    <DropZone
      bind:zoneHover
      on:fileDrop={(event) => {
        attachMoreFiles(event.detail);
        event.stopPropagation();
      }}
    >
      <div class="drag-wrapper" class:bodyHover>
        <ModalDialog
          bind:visible
          on:confirm
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
                left: 0,
                top: -14,
              }}
            >
              <IconButton slot="trigger" flavor="naked">
                <MdIcon theme="Outlined">insert_emoticon</MdIcon>
              </IconButton>

              <EmojiPicker
                slot="popover"
                on:insertEmoji={(event) => captionComposeArea?.insertText(event.detail)}
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
              <div
                bind:this={sendButtonWrapper}
                on:mouseenter={handleTriggerMouseEnter}
                on:mouseleave={handleTriggerMouseLeave}
              >
                <IconButton flavor="filled" disabled={!isSendingEnabled} on:click={sendMessages}>
                  <MdIcon theme="Filled">arrow_upward</MdIcon>
                </IconButton>
              </div>

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

        {#if zoneHover || bodyHover}
          <div class="drop-wrapper" class:zoneHover class:bodyHover>
            <div class="border">
              {$i18n.t(
                'dialog--compose-media-message.hint--drop-files-to-add',
                'Drop files here to add',
              )}
            </div>
          </div>
        {/if}
      </div>
    </DropZone>
  </ModalWrapper>
  <ConfirmClose bind:visible={confirmCloseDialogVisible} on:confirm={close} />
</template>

<style lang="scss">
  @use 'component' as *;

  $width: 640px;

  .drag-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;

    .drop-wrapper {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: calc($z-index-modal + $z-index-plus);

      &.bodyHover {
        display: block;
        padding: rem(8px);
        background-color: var(--t-main-background-color);

        .border {
          @extend %font-h5-400;
          display: grid;
          align-items: center;
          justify-items: center;
          width: 100%;
          height: 100%;
          border-radius: rem(8px);
          border: rem(2px) solid $consumer-green-600;
        }
      }
      &.zoneHover {
        .border {
          background-color: rgba($consumer-green-600, 10%);
        }
      }
    }
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

      &.disabled {
        :global(button) {
          cursor: not-allowed;
        }
      }
    }
  }
</style>
