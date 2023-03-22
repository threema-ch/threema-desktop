<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {type Readable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import FileTrigger from '#3sc/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';
  import Tooltip from '~/app/ui/generic/tooltip/Tooltip.svelte';

  /**
   * Text that will be used to initialize the compose area.
   */
  export let initialText: string | undefined;

  /**
   * Whether to display the attachment button.
   */
  export let displayAttachmentButton = true;

  // Component event dispatcher
  const dispatch = createEventDispatcher<{
    recordAudio: undefined;
    sendTextMessage: string;
  }>();

  // Reference to the compose area component
  let composeArea: ComposeArea;
  let composeAreaIsEmpty: Readable<boolean>;

  // Emoji picker
  let emojiButton: HTMLElement | undefined = undefined;
  let emojiPicker: EmojiPicker;

  /**
   * Show emoji picker if it's invisible.
   */
  function showEmojiPicker(event: MouseEvent): void {
    if (emojiPicker.isVisible() === true) {
      return;
    }

    emojiButton = event.currentTarget as HTMLElement;

    emojiPicker.show();

    // Prevent click event from bubbling up to the body element, where the emoji picker would
    // immediately be closed again.
    event.stopPropagation();
  }

  // TODO(DESK-196): Record audio messages
  // function recordAudio(): void {
  //   dispatch('recordAudio');
  // }

  // let isVisiblePopover = false;
  // let popoverEl: HTMLElement | undefined = undefined;

  // function handlePopoverButtonClick(event: MouseEvent): void {
  //   popoverEl = event.currentTarget as HTMLElement;
  //   isVisiblePopover = !isVisiblePopover;
  // }

  function sendTextMessage(): void {
    dispatch('sendTextMessage', composeArea.getText());
    composeArea.clearText();
    emojiPicker.hide();
  }

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeArea.insertText(text);
  }

  /**
   * Get current inserted text
   */
  export function getText(): string {
    return composeArea.getText();
  }

  /**
   * Remove entered text
   */
  export function clearText(): void {
    composeArea.clearText();
  }

  /**
   * Focus wrapper div
   */
  export function focus(): void {
    composeArea.focus();
  }
</script>

<template>
  <div class="emoji-picker">
    <EmojiPicker
      bind:this={emojiPicker}
      trigger={emojiButton}
      on:insertEmoji={(event) => composeArea.insertText(event.detail)}
    />
  </div>

  <!-- <div class="popover">
    <Popover
      isVisible={isVisiblePopover}
      anchor={popoverEl}
      attachAt={{
        x: 'left',
        y: 'top',
      }}
      popoverOrigin={{
        x: 'right',
        y: 'bottom',
      }}
    >
      <div style="width: 200px; height: 200px; background-color: red;" />
    </Popover>
  </div> -->

  <div class="wrapper">
    <div class="icons-left">
      {#if displayAttachmentButton}
        <FileTrigger on:fileDrop multiple>
          <IconButton flavor="naked">
            <MdIcon theme="Outlined">attach_file</MdIcon>
          </IconButton>
        </FileTrigger>
      {/if}
    </div>
    <ComposeArea
      {initialText}
      bind:this={composeArea}
      bind:isEmpty={composeAreaIsEmpty}
      on:submit={sendTextMessage}
      on:filePaste
    />
    <div class="icons-right">
      <IconButton flavor="naked" on:click={showEmojiPicker}>
        <MdIcon theme="Outlined">insert_emoticon</MdIcon>
      </IconButton>
      <Tooltip>
        <IconButton slot="trigger" flavor="naked">
          <MdIcon theme="Outlined">insert_emoticon</MdIcon>
        </IconButton>

        <div slot="tooltip">
          <p>Tooltip content</p>
        </div>
      </Tooltip>
      <!-- TODO: TEST -->
      <!-- <IconButton flavor="naked" on:click={handlePopoverButtonClick}>
        <MdIcon theme="Outlined">insert_emoticon</MdIcon>
      </IconButton> -->
      <!-- TODO: TEST -->
      {#if $composeAreaIsEmpty}
        <!-- <IconButton flavor="naked" on:click={recordAudio} class="wip">
        <MdIcon theme="Outlined">mic_none</MdIcon>
      </IconButton> -->
      {:else}
        <IconButton flavor="filled" on:click={sendTextMessage}>
          <MdIcon theme="Filled">arrow_upward</MdIcon>
        </IconButton>
      {/if}
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    display: grid;
    grid-template: 100% / auto 1fr auto;
    align-items: end;
    padding: rem(12px) rem(8px);
  }

  .icons-left,
  .icons-right {
    display: flex;
  }
</style>
