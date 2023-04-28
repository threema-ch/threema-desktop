<!--
  @component
  The modal window used for sending files, images and other media.
-->
<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import DropZone from '#3sc/components/blocks/DropZone/DropZone.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {MAX_CAPTION_BYTE_LENGTH, type MediaFile} from '~/app/ui/modal/media-message';
  import ActiveMediaFile from '~/app/ui/modal/media-message/ActiveMediaFile.svelte';
  import Caption from '~/app/ui/modal/media-message/Caption.svelte';
  import ConfirmClose from '~/app/ui/modal/media-message/ConfirmClose.svelte';
  import Miniatures from '~/app/ui/modal/media-message/Miniatures.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {ensureU53, type u53} from '~/common/types';
  import {assert} from '~/common/utils/assert';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {WritableStore} from '~/common/utils/store';
  import {getUtf8ByteLength} from '~/common/utils/string';
  import {type SendMessageEventDetail} from '~/common/viewmodel/conversation';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';

  export let title: string;
  export let mediaFiles: MediaFile[];
  export let visible: boolean;

  /**
   * Whether or not more files can be attached to the message.
   */
  export let moreFilesAttachable = true;

  let confirmCloseDialogVisible = false;
  let captionComposeArea: Caption;
  let activeMediaFile: MediaFile | undefined = mediaFiles[0];
  let currentCaptionTextByteLength: u53 | undefined;
  let isAnyCaptionTooLong: boolean | undefined;

  /**
   * Component event dispatcher
   */
  const dispatch = createEventDispatcher<{sendMessage: SendMessageEventDetail}>();

  function handleTextChange(event: CustomEvent<u53>): void {
    currentCaptionTextByteLength = event.detail;
  }

  function calcIsAnyCaptionTooLong(): boolean {
    return mediaFiles.some((mediaFile) => {
      const caption = mediaFile.caption.get();

      if (caption !== undefined) {
        return getUtf8ByteLength(caption) > MAX_CAPTION_BYTE_LENGTH;
      }

      return false;
    });
  }

  /**
   * Save the current visible caption text string into the mediaFile.caption property
   */
  function saveCurrentCaption(): void {
    if (activeMediaFile !== undefined) {
      activeMediaFile.caption.set(captionComposeArea.getText());
      isAnyCaptionTooLong = calcIsAnyCaptionTooLong();
    }
  }

  /**
   * Save and clear the current visible caption text string into the mediaFile.caption property
   */
  function saveAndClearCurrentCaption(): void {
    saveCurrentCaption();
    captionComposeArea.clearText();
  }

  /**
   * Clear the current active media file and auto switch to the next media file
   */
  function removeActiveMediaFile(): void {
    saveAndClearCurrentCaption();

    if (activeMediaFile !== undefined) {
      const index = mediaFiles.indexOf(activeMediaFile);
      assert(index >= 0, 'Active file could not be found in mediaFiles');

      // Remove
      mediaFiles.splice(index, 1);

      // Re-assign array to trigger Svelte reactivity
      mediaFiles = [...mediaFiles];

      // Set new active media file
      setNewActiveMediaFile(mediaFiles[index] ?? mediaFiles[Math.max(index - 1, 0)]);
    }
  }

  /**
   * Set the next active media file (eg, by click on preview of user), if it is undefined, hide
   * dialog.
   */
  function setNewActiveMediaFile(mediaFile: MediaFile | undefined): void {
    activeMediaFile = mediaFile;
    if (mediaFile === undefined) {
      visible = false;
      return;
    }

    captionComposeArea.insertText(mediaFile.caption.get() ?? '');
    captionComposeArea.focus();

    currentCaptionTextByteLength = captionComposeArea.getTextByteLength();
  }

  async function sendMessages(): Promise<void> {
    currentCaptionTextByteLength = captionComposeArea.getTextByteLength();

    // Prevent send if any caption is too long
    if (currentCaptionTextByteLength > MAX_CAPTION_BYTE_LENGTH || isAnyCaptionTooLong === true) {
      return;
    }

    saveCurrentCaption();
    visible = false;

    const files = await Promise.all(
      mediaFiles.map(async ({caption, file}) => ({
        blob: new Uint8Array(await file.arrayBuffer()),
        caption: caption.get(),
        fileName: file.name,
        fileSize: ensureU53(file.size),
        mediaType: file.type,
      })),
    );

    dispatch('sendMessage', {
      type: 'files',
      files,
    });
  }

  function attachMoreFiles(files: File[]): void {
    if (files.length === 0) {
      return;
    }
    const newMediaFiles = files.map(
      (file): MediaFile => ({
        type: 'local',
        file,
        caption: new WritableStore<string | undefined>(undefined),
        sanitizedFilenameDetails: getSanitizedFileNameDetails(file),
      }),
    );
    mediaFiles = [...mediaFiles, ...newMediaFiles];
    saveAndClearCurrentCaption();
    setNewActiveMediaFile(newMediaFiles[0]);
  }

  function closeWithOptionalConfirmation(event: CustomEvent): void {
    event.preventDefault();

    const needsConfirmation = mediaFiles.length > 1 || captionComposeArea.getText() !== '';

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

  $: isTextByteLengthVisible =
    currentCaptionTextByteLength !== undefined &&
    currentCaptionTextByteLength >= MAX_CAPTION_BYTE_LENGTH - 100;
  $: isMaxTextByteLengthExceeded =
    currentCaptionTextByteLength !== undefined &&
    currentCaptionTextByteLength > MAX_CAPTION_BYTE_LENGTH;
  $: isSendingDisabled = isMaxTextByteLengthExceeded || isAnyCaptionTooLong === true;

  onMount(() => {
    captionComposeArea.focus();
  });
</script>

<svelte:body
  on:threema-drag-start={() => {
    bodyHover = true;
  }}
  on:threema-drag-end={() => {
    bodyHover = false;
  }}
/>

<template>
  <ModalWrapper>
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
            {#if activeMediaFile !== undefined}
              <ActiveMediaFile mediaFile={activeMediaFile} on:remove={removeActiveMediaFile} />
            {/if}
          </div>
          <div class="footer" slot="footer">
            <div class="caption">
              <Caption
                bind:this={captionComposeArea}
                initialText={activeMediaFile?.caption?.get()}
                on:submit={sendMessages}
                on:textByteLengthChanged={handleTextChange}
              />
              {#if isTextByteLengthVisible}
                <div class="bytes-count" class:exceeded={isMaxTextByteLengthExceeded}>
                  {currentCaptionTextByteLength}/{MAX_CAPTION_BYTE_LENGTH}
                </div>
              {/if}
            </div>
            <Popover
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
                on:insertEmoji={(event) => captionComposeArea.insertText(event.detail)}
              />
            </Popover>
            <div class="miniatures">
              <Miniatures
                {mediaFiles}
                {activeMediaFile}
                {moreFilesAttachable}
                on:select={(event) => {
                  saveAndClearCurrentCaption();
                  // Set new active media file
                  setNewActiveMediaFile(event.detail);
                }}
                on:fileDrop={(event) => attachMoreFiles(event.detail)}
              />
            </div>
            <div class="action">
              <IconButton flavor="filled" on:click={sendMessages} disabled={isSendingDisabled}>
                <MdIcon theme="Filled">arrow_upward</MdIcon>
              </IconButton>
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
      'miniatures action' min(#{rem(80px)})
      / calc(100% - #{rem(50px)}) #{rem(50px)};

    .caption {
      padding: rem(8px) rem(8px) rem(8px) rem(16px);

      .bytes-count {
        display: flex;
        place-content: end;

        &.exceeded {
          color: var(--cc-compose-bar-bytes-count-exceeded-color);
        }
      }
    }

    .miniatures {
      align-self: start;
      height: rem(64px);
      padding: 0 rem(16px) 0 rem(16px);
    }

    .action {
      align-self: start;
      padding-top: rem(12px);
      padding-left: rem(2px);
    }
  }
</style>
