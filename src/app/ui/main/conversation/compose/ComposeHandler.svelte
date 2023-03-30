<script lang="ts">
  import ComposeBar from '~/app/ui/main/conversation/compose/ComposeBar.svelte';
  import {type MediaFile} from '~/app/ui/modal/media-message';
  import MediaMessage from '~/app/ui/modal/MediaMessage.svelte';
  import {ReceiverType} from '~/common/enum';
  import {type AnyReceiverStore} from '~/common/model';
  import {type Remote} from '~/common/utils/endpoint';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {WritableStore} from '~/common/utils/store';

  /**
   * Text that will be used to initialize the compose area.
   */
  export let initialText: string | undefined;

  /**
   * Whether to display the attachment button.
   */
  export let displayAttachmentButton = true;

  /**
   * The conversation's Receiver
   */
  export let receiver: Remote<AnyReceiverStore>;

  // Reference to the compose area component
  let composeBar: ComposeBar;

  // Media Files
  export let mediaMessageDialogVisible = false;
  let mediaFiles: MediaFile[] = [];

  /**
   * Handle the pasted files by opening the media compose message dialog.
   */
  function handleFilePaste(files: File[]): void {
    openMediaMessageDialog(files, 'pasted');
  }

  /**
   * Handle the dropped files by opening the media compose message dialog.
   */
  export function handleFileDrop(files: File[]): void {
    openMediaMessageDialog(files, 'local');
  }

  /**
   * Open the media compose message dialog.
   */
  function openMediaMessageDialog(files: File[], type: MediaFile['type']): void {
    mediaFiles = files.map((file) => ({
      type,
      file,
      caption: new WritableStore<string | undefined>(undefined),
      sanitizedFilenameDetails: getSanitizedFileNameDetails(file),
    }));

    // If there is only one file, move the current compose text to the caption.
    if (mediaFiles.length === 1) {
      mediaFiles[0].caption.set(composeBar.getText());
      clearText();
    }

    mediaMessageDialogVisible = true;
  }

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeBar.insertText(text);
  }

  /**
   * Get current inserted text
   */
  export function getText(): string | undefined {
    return composeBar.getText();
  }

  /**
   * Remove entered text
   */
  export function clearText(): void {
    composeBar.clearText();
  }

  /**
   * Focus wrapper div
   */
  export function focus(): void {
    composeBar.focus();
  }
</script>

<template>
  <ComposeBar
    bind:this={composeBar}
    {initialText}
    {displayAttachmentButton}
    on:sendTextMessage
    on:recordAudio
    on:filePaste={(event) => handleFilePaste(event.detail)}
    on:fileDrop={(event) => handleFileDrop(event.detail)}
  />

  {#if mediaMessageDialogVisible}
    <MediaMessage
      title={`Send File to ${
        $receiver.type === ReceiverType.DISTRIBUTION_LIST
          ? $receiver.view.stub
          : $receiver.view.displayName
      }`}
      {mediaFiles}
      bind:visible={mediaMessageDialogVisible}
      on:sendMessage
    />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;
</style>
