<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import DropZone from '#3sc/components/blocks/DropZone/DropZone.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import {type MediaFile} from '~/app/ui/modal/media-message';
  import ActiveFile from '~/app/ui/modal/media-message/ActiveFile.svelte';
  import Caption from '~/app/ui/modal/media-message/Caption.svelte';
  import ConfirmClose from '~/app/ui/modal/media-message/ConfirmClose.svelte';
  import Miniatures from '~/app/ui/modal/media-message/Miniatures.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {ensureU53} from '~/common/types';
  import {assert} from '~/common/utils/assert';
  import {type SendMessageEventDetail} from '~/common/viewmodel/conversation';

  export let title: string;
  export let mediaFiles: MediaFile[];
  export let visible: boolean;
  let confirmCloseDialogVisible = false;

  /**
   * Whether or not more files can be attached to the message.
   */
  export let moreFilesAttachable = true;

  let caption: Caption;

  let activeMediaFile: MediaFile | undefined = mediaFiles[0];

  /**
   * Component event dispatcher
   */
  const dispatch = createEventDispatcher<{sendMessage: SendMessageEventDetail}>();

  /**
   * Save the current visible caption text string into the mediaFile.caption property
   */
  function saveCurrentCaption(): void {
    if (activeMediaFile !== undefined) {
      activeMediaFile.caption = caption.getText();
    }
  }

  /**
   * Save and clear the current visible caption text string into the mediaFile.caption property
   */
  function saveAndClearCurrentCaption(): void {
    saveCurrentCaption();
    caption.clearText();
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

    caption.insertText(mediaFile.caption ?? '');
    caption.focus();
  }

  async function sendMessage(): Promise<void> {
    saveCurrentCaption();
    visible = false;

    const files = await Promise.all(
      mediaFiles.map(async ({caption: fileCaption, file}) => ({
        blob: new Uint8Array(await file.arrayBuffer()),
        caption: fileCaption,
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
    const newMediaFiles = files.map((file) => ({
      file,
    }));
    mediaFiles = [...mediaFiles, ...newMediaFiles];
    saveAndClearCurrentCaption();
    setNewActiveMediaFile(newMediaFiles[0]);
  }

  function openConfirmCloseDialog(event: CustomEvent): void {
    confirmCloseDialogVisible = true;
    event.preventDefault();
  }

  /**
   * Close this media message modal.
   */
  function close(_: CustomEvent): void {
    visible = false;
  }

  let zoneHover = false;
  let bodyHover = false;

  // Emoji picker
  let emojiPicker: EmojiPicker;
  let emojiPickerPosition = {x: 0, y: 0};

  /**
   * Show emoji picker if it's invisible.
   */
  function showEmojiPicker(event: MouseEvent): void {
    const isVisible: boolean = emojiPicker.isVisible();
    if (isVisible) {
      return;
    }

    // Show emoji picker at top left of button
    const emojiButton = event.currentTarget as HTMLElement;
    const rect = emojiButton.getBoundingClientRect();
    emojiPickerPosition = {x: rect.left, y: rect.top};
    emojiPicker.show();

    // Prevent click event from bubbling up to the body element, where the emoji picker would
    // immediately be closed again.
    event.stopPropagation();
  }

  onMount(() => {
    caption.focus();
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
  <div class="emoji-picker">
    <EmojiPicker
      bind:this={emojiPicker}
      {...emojiPickerPosition}
      on:insertEmoji={(event) => caption.insertText(event.detail)}
    />
  </div>
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
          on:close={openConfirmCloseDialog}
          on:cancel={openConfirmCloseDialog}
        >
          <TitleAndClose let:modal {modal} slot="header" {title} />
          <div class="body" slot="body">
            <ActiveFile file={activeMediaFile?.file} on:remove={removeActiveMediaFile} />
          </div>
          <div class="footer" slot="footer">
            <div class="caption">
              <Caption bind:this={caption} initialText={activeMediaFile?.caption} />
            </div>
            <div class="emoji-picker">
              <IconButton flavor="naked" on:click={showEmojiPicker}>
                <MdIcon theme="Outlined">insert_emoticon</MdIcon>
              </IconButton>
            </div>
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
              <IconButton flavor="filled" on:click={sendMessage}>
                <MdIcon theme="Filled">arrow_upward</MdIcon>
              </IconButton>
            </div>
          </div>
        </ModalDialog>

        {#if zoneHover || bodyHover}
          <div class="drop-wrapper" class:zoneHover class:bodyHover>
            <div class="border">Drop files here to add</div>
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
